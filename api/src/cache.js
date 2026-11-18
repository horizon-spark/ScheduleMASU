const { getRedis } = require("./redis");

async function getJson(key) {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[cache] get failed:", key, e.message);
    return null; // деградируем, не роняем запрос
  }
}

async function setJson(key, value, ttlSec) {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (e) {
    console.warn("[cache] set failed:", key, e.message);
  }
}

// Обёртка «get-or-fetch»: пробуем кэш, при промахе — fetcher, затем set.
async function cached(key, ttlSec, fetcher) {
  const hit = await getJson(key);
  if (hit !== null) return hit;
  const value = await fetcher();
  // Не кэшируем пустое/невалидное
  if (value !== undefined && value !== null) {
    await setJson(key, value, ttlSec);
  }
  return value;
}

module.exports = { getJson, setJson, cached };