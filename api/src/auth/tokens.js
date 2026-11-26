const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const config = require("../config");
const { getRedis } = require("../redis");
const logger = require("../logger");

const RT_PREFIX = "rt:";

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

async function issueRefresh(profile) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: profile.username, type: "refresh", jti },
    config.jwt.secret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(
        `${RT_PREFIX}${jti}`,
        JSON.stringify({ sub: profile.username, iat: Date.now() }),
        { EX: config.jwt.refreshTtlSec }
      );
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
  if (payload.type !== "refresh" || !payload.jti) {
    const e = new Error("Not a refresh token");
    e.name = "JsonWebTokenError";
    throw e;
  }
  return payload;
}

async function isRefreshActive(jti) {
  const redis = await getRedis();
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
    const raw = await redis.get(`${RT_PREFIX}${jti}`);
    return raw !== null;
  } catch (e) {
    logger.error({ err: e, jti }, "[tokens] failed to check refresh");
    return null;
  }
}

async function revokeRefresh(jti) {
  const redis = await getRedis();
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
    await redis.del(`${RT_PREFIX}${jti}`);
  } catch (e) {
    logger.error({ err: e, jti }, "[tokens] failed to revoke refresh");
  }
}

module.exports = {
  signAccess,
  issueRefresh,
  verifyRefresh,
  isRefreshActive,
  revokeRefresh,
};