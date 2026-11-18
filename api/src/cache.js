const { getRedis } = require("./redis");
const logger = require("./logger");

async function getJson(key) {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    logger.warn({ err: e, key }, "[cache] get failed");
    return null;
  }
}

async function setJson(key, value, ttlSec) {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (e) {
    logger.warn({ err: e, key }, "[cache] set failed");
  }
}

async function cached(key, ttlSec, fetcher) {
  const hit = await getJson(key);
  if (hit !== null) return hit;
  const value = await fetcher();
  if (value !== undefined && value !== null) {
    await setJson(key, value, ttlSec);
  }
  return value;
}

module.exports = { getJson, setJson, cached };