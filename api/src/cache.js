const config = require("./config");
const redisModule = require("./redis");
const logger = require("./logger");

const STALE_SUFFIX = ":stale";

async function getJson(key, redisClient) {
  const redis =
    redisClient === undefined ? await redisModule.getRedis() : redisClient;
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    logger.warn({ err: e, key }, "[cache] get failed");
    return null;
  }
}

async function setJson(key, value, ttlSec, redisClient) {
  const redis =
    redisClient === undefined ? await redisModule.getRedis() : redisClient;
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (e) {
    logger.warn({ err: e, key }, "[cache] set failed");
  }
}

async function fetchAndStore(key, ttlSec, fetcher, redisClient) {
  const value = await fetcher();
  if (value !== undefined && value !== null) {
    const staleTtlSec = config.cache.staleTtlSec;
    await setJson(key, value, ttlSec, redisClient);
    await setJson(`${key}${STALE_SUFFIX}`, value, staleTtlSec, redisClient);
  }
  return value;
}

function canServeStale(err) {
  const status = err && err.response && err.response.status;
  if (status === undefined) return true; // сеть, таймаут, DNS
  return status === 408 || status >= 500;
}

/**
 * Отдаёт свежий кеш, иначе загружает upstream.
 * Если upstream упал временно, но есть последний успешный ответ, возвращает
 * его с флагом stale вместо ошибки.
 */
async function cached(key, ttlSec, fetcher, redisClient) {
  const hit = await getJson(key, redisClient);
  if (hit !== null) {
    return { value: hit, stale: false };
  }

  try {
    const value = await fetchAndStore(key, ttlSec, fetcher, redisClient);
    return { value, stale: false };
  } catch (err) {
    if (!canServeStale(err)) throw err;
    const stale = await getJson(`${key}${STALE_SUFFIX}`, redisClient);
    if (stale !== null) {
      logger.warn({ key }, "[cache] serving stale response after upstream error");
      return { value: stale, stale: true };
    }
    throw err;
  }
}

/**
 * Обход свежего кеша для pull-to-refresh. При временной ошибке upstream
 * всё равно пытается отдать stale-копию.
 */
async function refresh(key, ttlSec, fetcher, redisClient) {
  try {
    const value = await fetchAndStore(key, ttlSec, fetcher, redisClient);
    return { value, stale: false };
  } catch (err) {
    if (!canServeStale(err)) throw err;
    const stale = await getJson(`${key}${STALE_SUFFIX}`, redisClient);
    if (stale !== null) {
      logger.warn({ key }, "[cache] serving stale response after refresh error");
      return { value: stale, stale: true };
    }
    throw err;
  }
}

module.exports = {
  getJson,
  setJson,
  cached,
  refresh,
  STALE_SUFFIX,
};
