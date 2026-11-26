const { createClient } = require("redis");
const config = require("./config");
const logger = require("./logger");

// После потери связи клиент пытается переподключиться сам. Ограничиваем
// число попыток: если Redis не вернулся, закрываем клиент, а следующий
// вызов getRedis создаст новый. Иначе TCP-соединение и таймеры живут
// бесконечно и API остаётся в неопределённом состоянии.
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 200;
const RECONNECT_MAX_DELAY_MS = 2000;

// Пауза между неудачными попытками подключения, чтобы не тормозить каждый
// запрос и /ready на полный connectTimeout.
const RETRY_COOLDOWN_MS = 10_000;

let client = null;
let connecting = null; // промис, чтобы не создавать клиент дважды при гонке
let retryAfter = 0;

function reconnectDelay(retries) {
  return Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** retries,
    RECONNECT_MAX_DELAY_MS
  );
}

function createRedisClient() {
  const c = createClient({
    url: config.redis.url,
    socket: {
      connectTimeout: config.redis.connectTimeoutMs,
      reconnectStrategy: (retries) => {
        if (retries >= MAX_RECONNECT_ATTEMPTS) {
          return new Error("Redis reconnect attempts exhausted");
        }
        return reconnectDelay(retries);
      },
    },
  });

  c.on("error", (err) => {
    logger.error({ err }, "[Redis] client error");
  });
  c.on("reconnecting", () => {
    logger.warn("[Redis] reconnecting");
  });
  c.on("ready", () => {
    logger.info("[Redis] ready");
  });
  c.on("end", () => {
    if (client === c) client = null;
  });

  return c;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
    if (typeof timer.unref === "function") timer.unref();
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Возвращает готовый Redis-клиент или null, если Redis не настроен/недоступен.
 * Старт API не должен зависеть от доступности Redis: ограниченное ожидание,
 * затем работа в деградированном режиме (rate-limit в памяти, кеш отключён).
 */
async function getRedis() {
  if (!config.redis.url) return null;

  if (client) {
    if (client.isReady) return client;
    // Клиент открыт, но ещё переподключается — не ставим команды в очередь,
    // иначе запросы могут зависнуть до восстановления связи.
    if (client.isOpen) return null;
    client = null;
  }

  if (Date.now() < retryAfter) return null;

  // Кто-то уже подключается — ждём его
  if (connecting) return connecting;

  connecting = (async () => {
    let c = null;
    let connectPromise = null;
    let cancelled = false;

    try {
      c = createRedisClient();
      connectPromise = c.connect();
      // Если сработает таймаут, отклонение промиса не должно стать unhandled.
      connectPromise.catch(() => {});

      await withTimeout(
        connectPromise,
        config.redis.connectTimeoutMs,
        "Redis connect timeout"
      );
      logger.info("[Redis] connected");
      client = c;
      retryAfter = 0;
      return client;
    } catch (err) {
      cancelled = true;
      logger.error({ err }, "[Redis] connection failed");
      retryAfter = Date.now() + RETRY_COOLDOWN_MS;

      // Клиент мог подключиться уже после таймаута — закрываем его,
      // чтобы не оставить бесхозное соединение.
      if (connectPromise && c) {
        void connectPromise
          .then(() => {
            if (cancelled) return c.disconnect();
          })
          .catch(() => {});
      }

      if (c) {
        try {
          await c.disconnect();
        } catch {
          /* ignore */
        }
      }
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

module.exports = { getRedis };
