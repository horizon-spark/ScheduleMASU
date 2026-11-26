const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const config = require("../config");
const { getRedis } = require("../redis");
const logger = require("../logger");

const RT_PREFIX = "rt:";
const RT_USER_PREFIX = "rt:user:";

function refreshKey(jti) {
  return `${RT_PREFIX}${jti}`;
}

function userRefreshKey(sub) {
  return `${RT_USER_PREFIX}${sub}`;
}

function signAccess(profile) {
  return jwt.sign(
    { ...profile, type: "access" },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );
}

async function issueRefresh(profile, redisClient) {
  if (!profile.username || typeof profile.username !== "string") {
    const e = new Error("Refresh token requires a username");
    e.code = "INVALID_PROFILE";
    throw e;
  }

  const jti = randomUUID();
  const token = jwt.sign(
    {
      // Профиль дублируем в refresh, чтобы после ротации access-токен
      // не терял displayName/email и /me оставался консистентным.
      sub: profile.username,
      displayName: profile.displayName ?? null,
      email: profile.email ?? null,
      type: "refresh",
      jti,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );

  const redis =
    redisClient === undefined ? await getRedis() : redisClient;
  if (redis) {
    try {
      // Храним и сам refresh, и индекс активных jti пользователя:
      // при обнаружении повторного использования отзываем все сессии.
      await redis
        .multi()
        .set(
          refreshKey(jti),
          JSON.stringify({ sub: profile.username, iat: Date.now() }),
          { EX: config.jwt.refreshTtlSec }
        )
        .sAdd(userRefreshKey(profile.username), jti)
        .expire(userRefreshKey(profile.username), config.jwt.refreshTtlSec)
        .exec();
    } catch (e) {
      logger.error({ err: e }, "[tokens] failed to store refresh");
      // Не выдаём refresh, если не смогли его сохранить —
      // иначе он будет невалиден при первом же refresh.
      throw e;
    }
  } else if (config.redis.url) {
    // Redis настроен, но недоступен. Выдавать refresh без возможности
    // отзыва нельзя: это обходит ротацию и logout.
    logger.error(
      "[tokens] Redis unavailable — refusing to issue non-revocable refresh"
    );
    const e = new Error("Token store unavailable");
    e.code = "REDIS_UNAVAILABLE";
    throw e;
  } else {
    // Redis не настроен вовсе. В dev это допустимо, в prod — нет
    // (config не даст стартовать без REDIS_URL).
    logger.warn("[tokens] Redis disabled — refresh tokens are not revocable");
  }

  return token;
}

function verifyRefresh(token) {
  // Отдельно от verifyAccess: проверяем type === "refresh"
  const payload = jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
  if (
    payload.type !== "refresh" ||
    !payload.jti ||
    typeof payload.sub !== "string" ||
    !payload.sub
  ) {
    const e = new Error("Not a refresh token");
    e.name = "JsonWebTokenError";
    throw e;
  }
  return payload;
}

async function isRefreshActive(jti, redisClient) {
  const redis =
    redisClient === undefined ? await getRedis() : redisClient;
  if (!redis) {
    if (config.redis.url) {
      // Не можем проверить отзыв — не выдаём 401 (клиент разлогинится),
      // а сообщаем вызывающему коду о временной недоступности хранилища.
      logger.error(
        "[tokens] Redis unavailable — cannot verify refresh token"
      );
      return null;
    }
    return true; // Redis не настроен: проверять нечем (dev)
  }

  try {
    const raw = await redis.get(refreshKey(jti));
    return raw !== null;
  } catch (e) {
    logger.error({ err: e, jti }, "[tokens] failed to check refresh");
    return null;
  }
}

async function revokeRefresh(jti, sub, redisClient) {
  const redis =
    redisClient === undefined ? await getRedis() : redisClient;
  if (!redis) {
    if (config.redis.url) {
      logger.error(
        { jti },
        "[tokens] Redis unavailable — refresh token was not revoked"
      );
    }
    return;
  }
  try {
    await redis.del(refreshKey(jti));
    if (sub) {
      await redis.sRem(userRefreshKey(sub), jti);
    }
  } catch (e) {
    logger.error({ err: e, jti }, "[tokens] failed to revoke refresh");
  }
}

/**
 * Отзывает все refresh-сессии пользователя. Используется при обнаружении
 * повторного использования уже ротированного refresh-токена: это может
 * означать кражу, поэтому завершаем не только подозрительную сессию.
 */
async function revokeAllForUser(sub, redisClient) {
  if (!sub) return 0;

  const redis =
    redisClient === undefined ? await getRedis() : redisClient;
  if (!redis) {
    if (config.redis.url) {
      logger.error(
        { sub },
        "[tokens] Redis unavailable — user sessions were not revoked"
      );
    }
    return 0;
  }

  try {
    const jtis = await redis.sMembers(userRefreshKey(sub));
    const tx = redis.multi();

    for (const jti of jtis) {
      tx.del(refreshKey(jti));
    }
    tx.del(userRefreshKey(sub));
    await tx.exec();

    return jtis.length;
  } catch (e) {
    logger.error({ err: e, sub }, "[tokens] failed to revoke user sessions");
    return 0;
  }
}

module.exports = {
  signAccess,
  issueRefresh,
  verifyRefresh,
  isRefreshActive,
  revokeRefresh,
  revokeAllForUser,
};
