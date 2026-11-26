const { before, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "test-secret-for-token-tests";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = JWT_SECRET;
process.env.REDIS_URL = "";
process.env.LDAP_URL = "ldap://127.0.0.1:389";
process.env.LDAP_BIND_DN = "CN=test";
process.env.LDAP_BIND_CREDENTIALS = "test";
process.env.LDAP_SEARCH_BASE = "DC=test";
process.env.SCHEDULE_API_URL = "https://example.invalid";
process.env.SCHEDULE_API_BEARER_TOKEN = "test";

let tokens;

function createFakeRedis() {
  const strings = new Map();
  const sets = new Map();

  function deleteKey(key) {
    strings.delete(key);
    sets.delete(key);
  }

  const redis = {
    strings,
    sets,
    multi() {
      const operations = [];
      const chain = {
        set(key, value) {
          operations.push(() => strings.set(key, value));
          return chain;
        },
        sAdd(key, member) {
          operations.push(() => {
            if (!sets.has(key)) sets.set(key, new Set());
            sets.get(key).add(member);
          });
          return chain;
        },
        expire() {
          return chain;
        },
        del(key) {
          operations.push(() => deleteKey(key));
          return chain;
        },
        async exec() {
          for (const operation of operations) operation();
          return [];
        },
      };
      return chain;
    },
    async get(key) {
      return strings.get(key) ?? null;
    },
    async del(key) {
      if (Array.isArray(key)) {
        for (const item of key) deleteKey(item);
      } else {
        deleteKey(key);
      }
    },
    async sRem(key, member) {
      sets.get(key)?.delete(member);
    },
    async sMembers(key) {
      return [...(sets.get(key) ?? [])];
    },
  };

  return redis;
}

before(() => {
  tokens = require("../src/auth/tokens");
});

it("stores refresh token and adds it to the user session index", async () => {
  const redis = createFakeRedis();
  const token = await tokens.issueRefresh(
    {
      username: "test",
      displayName: "Тестовый Пользователь",
      email: "test@example.com",
    },
    redis
  );

  const payload = jwt.verify(token, JWT_SECRET, {
    issuer: "ldap-auth-api",
    audience: "mobile",
  });

  assert.equal(payload.sub, "test");
  assert.equal(payload.displayName, "Тестовый Пользователь");
  assert.equal(payload.email, "test@example.com");
  assert.equal(typeof payload.jti, "string");

  assert.ok(redis.strings.has(`rt:${payload.jti}`));
  assert.ok(redis.sets.get("rt:user:test").has(payload.jti));
});

it("revokes a single refresh token and removes it from the index", async () => {
  const redis = createFakeRedis();
  const token = await tokens.issueRefresh({ username: "test" }, redis);
  const payload = jwt.decode(token);

  assert.equal(await tokens.isRefreshActive(payload.jti, redis), true);

  await tokens.revokeRefresh(payload.jti, "test", redis);

  assert.equal(await tokens.isRefreshActive(payload.jti, redis), false);
  assert.equal(redis.sets.get("rt:user:test").has(payload.jti), false);
});

it("revokes every refresh session of a user", async () => {
  const redis = createFakeRedis();
  const first = jwt.decode(
    await tokens.issueRefresh({ username: "test" }, redis)
  );
  const second = jwt.decode(
    await tokens.issueRefresh({ username: "test" }, redis)
  );

  const revoked = await tokens.revokeAllForUser("test", redis);

  assert.equal(revoked, 2);
  assert.equal(redis.strings.has(`rt:${first.jti}`), false);
  assert.equal(redis.strings.has(`rt:${second.jti}`), false);
  assert.equal(redis.sets.has("rt:user:test"), false);
});

it("refuses to issue a refresh token without a username", async () => {
  await assert.rejects(
    () => tokens.issueRefresh({ username: "" }, createFakeRedis()),
    (err) => err.code === "INVALID_PROFILE"
  );
});
