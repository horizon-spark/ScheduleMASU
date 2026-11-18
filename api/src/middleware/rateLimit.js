const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedis } = require("../redis");

async function buildStore(prefix) {
  const redis = await getRedis();
  if (!redis) return undefined;

  // node-redis v4: sendCommand принимает МАССИВ аргументов.
  // rate-limit-redis вызывает sendCommand("INCRBY", key, 1) — собираем обратно в массив.
  return new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix,
  });
}

async function createLimiters() {
  const loginStore = await buildStore("rl:login:");
  const apiStore = await buildStore("rl:api:");

  if (!loginStore) {
    console.warn(
      "[rate-limit] MemoryStore used: counts are per-process. " +
        "Set REDIS_URL for cluster-wide limits."
    );
  }

  const loginLimiter = rateLimit({
    store: loginStore,
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Успешный логин (<400) не должен съедать квоту.
    skipSuccessfulRequests: true,
    // Падение Redis не должно ронять /api.
    passOnStoreError: true,
    message: { success: false, message: "Too many login attempts" },
    // Ключ: ip + username. Username нормализуем, чтобы "Ivan" и "ivan" считались одним.
    keyGenerator: (req) => {
      const username = String(req.body?.username || "").toLowerCase();
      return `${req.ip}:${username}`;
    },
  });

  const apiLimiter = rateLimit({
    store: apiStore,
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: { success: false, message: "Too many requests" },
    // req.ip уже учитывает trust proxy 1 (X-Forwarded-For от Nginx).
    keyGenerator: (req) => req.ip,
  });

  return { loginLimiter, apiLimiter };
}

module.exports = { createLimiters };