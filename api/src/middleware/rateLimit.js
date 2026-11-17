const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedis } = require("../redis");

async function buildStore(prefix) {
  const redis = await getRedis();
  if (!redis) return undefined;
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
    message: { success: false, message: "Too many login attempts" },
    keyGenerator: (req) => req.ip,
  });

  const apiLimiter = rateLimit({
    store: apiStore,
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests" },
    keyGenerator: (req) => req.ip,
  });

  return { loginLimiter, apiLimiter };
}

module.exports = { createLimiters };