const express = require("express");
const os = require("os");
const net = require("net");
const config = require("../config");
const { getRedis } = require("../redis");

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
    if (typeof timer.unref === "function") timer.unref();
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildHealthRouter() {
  const router = express.Router();

  // liveness — «процесс жив», без зависимостей
  router.get("/health", (_req, res) =>
    res.json({
      ok: true,
      pid: process.pid,
      uptime: process.uptime(),
      loadavg: os.loadavg(),
    })
  );

  // readiness — «можно слать трафик»
  router.get("/ready", async (req, res) => {
    const checks = { redis: "unknown", ldap: "unknown" };
    const redisConfigured = Boolean(config.redis.url);
    let ok = true;

    // Redis
    try {
      const redis = await getRedis();
      if (!redisConfigured) {
        checks.redis = "disabled";
      } else if (!redis) {
        // REDIS_URL задан, но клиент не готов: это не «выключено»,
        // а реальная деградация — readiness должен вернуть 503.
        checks.redis = "fail";
        ok = false;
      } else {
        await withTimeout(redis.ping(), 2000, "redis ping timeout");
        checks.redis = "ok";
      }
    } catch (e) {
      req.log.error({ err: e }, "[ready] redis check failed");
      checks.redis = "fail";
      ok = false;
    }

    // LDAP: дешёвая проверка TCP-коннекта, без bind
    try {
      const u = new URL(config.ldap.url);
      await new Promise((resolve, reject) => {
        const s = net.connect(
          Number(u.port || 389),
          u.hostname,
          () => {
            s.end();
            resolve();
          }
        );
        s.setTimeout(2000, () => {
          s.destroy();
          reject(new Error("ldap timeout"));
        });
        s.on("error", reject);
      });
      checks.ldap = "ok";
    } catch (e) {
      req.log.error({ err: e }, "[ready] ldap check failed");
      checks.ldap = "fail";
      ok = false;
    }

    res.status(ok ? 200 : 503).json({ ok, checks });
  });

  return router;
}

module.exports = { buildHealthRouter };