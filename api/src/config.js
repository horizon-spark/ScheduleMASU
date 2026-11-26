require("dotenv").config();

const logger = require("./logger");

function required(name) {
  const v = process.env[name];
  if (!v) {
    logger.fatal({ variable: name }, "[ENV] Missing required variable");
    process.exit(1);
  }
  return v;
}

function int(name, def) {
  const v = process.env[name];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    logger.fatal({ variable: name, value: v }, "[ENV] must be a number");
    process.exit(1);
  }
  return n;
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: int("PORT", 3000),
  concurrency: int("WEB_CONCURRENCY", 0),

  jwt: {
    secret: required("JWT_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    refreshTtlSec: int("JWT_REFRESH_TTL_SEC", 30 * 24 * 60 * 60), // 30 дней в секундах
    issuer: "ldap-auth-api",
    audience: "mobile",
  },

  ldap: {
    url: required("LDAP_URL"),
    bindDN: required("LDAP_BIND_DN"),
    bindCredentials: required("LDAP_BIND_CREDENTIALS"),
    searchBase: required("LDAP_SEARCH_BASE"),
    searchFilter:
      process.env.LDAP_SEARCH_FILTER ||
      "(|(sAMAccountName={{username}})(userPrincipalName={{username}}))",
    searchAttributes: (
      process.env.LDAP_SEARCH_ATTRIBUTES || "displayName,mail,sAMAccountName"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    timeout: int("LDAP_TIMEOUT_MS", 5000),
    connectTimeout: int("LDAP_CONNECT_TIMEOUT_MS", 3000),
  },

  redis: {
    url: process.env.REDIS_URL || null,
    // Сколько ждать Redis при старте, прежде чем продолжить в деградированном
    // режиме. Без этого node-redis переподключается бесконечно и API не
    // начинает слушать порт.
    connectTimeoutMs: int("REDIS_CONNECT_TIMEOUT_MS", 2000),
  },

  scheduleApi: {
    url: required("SCHEDULE_API_URL"),
    timeout: int("SCHEDULE_API_TIMEOUT_MS", 10000),
    bearerToken: required("SCHEDULE_API_BEARER_TOKEN"),
  },
};

// Production-проверки: слабый секрет и отсутствие Redis несовместимы с релизом.
if (config.env === "production") {
  if (!config.redis.url) {
    logger.fatal(
      { variable: "REDIS_URL" },
      "[ENV] REDIS_URL is required in production"
    );
    process.exit(1);
  }

  if (config.jwt.secret.length < 32) {
    logger.fatal(
      { variable: "JWT_SECRET" },
      "[ENV] JWT_SECRET must be at least 32 characters in production"
    );
    process.exit(1);
  }

  if (!config.scheduleApi.url.startsWith("https://")) {
    logger.warn(
      { variable: "SCHEDULE_API_URL" },
      "[ENV] SCHEDULE_API_URL should use https://"
    );
  }
}

module.exports = config;