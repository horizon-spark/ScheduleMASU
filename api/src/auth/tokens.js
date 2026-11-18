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
  } else {
    // Без Redis refresh не работает (негде хранить jti).
    // В dev это допустимо, в prod — нет.
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
  if (!redis) return true; // без Redis не можем проверить — доверяем подписи
  const raw = await redis.get(`${RT_PREFIX}${jti}`);
  return raw !== null;
}

async function revokeRefresh(jti) {
  const redis = await getRedis();
  if (!redis) return;
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