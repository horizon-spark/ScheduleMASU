const { createClient } = require("redis");
const config = require("./config");
const logger = require("./logger");

let client = null;
let connecting = null; // промис, чтобы не создавать клиент дважды при гонке

async function getRedis() {
  if (!config.redis.url) return null;

  // Уже подключён — возвращаем сразу
  if (client && client.isOpen) return client;

  // Кто-то уже подключается — ждём его
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({ url: config.redis.url });

    c.on("error", (err) => {
      logger.error({ err }, "[Redis] client error");
    });
    c.on("reconnecting", () => {
      logger.warn("[Redis] reconnecting");
    });
    c.on("ready", () => {
      logger.info("[Redis] ready");
    });

    try {
      await c.connect();
      logger.info("[Redis] connected");
      client = c;
      return client;
    } catch (err) {
      logger.error({ err }, "[Redis] connection failed");
      client = null;
      // Пытаемся корректно закрыть недо-подключённый клиент
      try {
        await c.disconnect();
      } catch {
        /* ignore */
      }
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

module.exports = { getRedis };