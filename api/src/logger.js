const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

const options = {
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

  // Маскируем чувствительные поля — они не должны попадать в логи
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "token",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
};

function createLogger() {
  // В dev — красивый вывод, в prod — чистый JSON.
  // pino-pretty — runtime-зависимость (Docker ставит только dependencies),
  // но если её всё же нет, API должен стартовать с JSON-логами.
  if (isProd) return pino(options);

  try {
    return pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
      },
    });
  } catch (err) {
    console.warn(
      "[logger] pino-pretty unavailable, falling back to JSON:",
      err.message
    );
    return pino(options);
  }
}

module.exports = createLogger().child({ service: "ldap-auth-api" });
