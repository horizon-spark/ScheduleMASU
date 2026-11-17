require("dotenv").config();

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[ENV] Missing required variable: ${name}`);
    process.exit(1);
  }
  return v;
}

function int(name, def) {
  const v = process.env[name];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    console.error(`[ENV] ${name} must be a number`);
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
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
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
  },
};

module.exports = config;