const { after, before, it } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "test-secret";
process.env.REDIS_URL = "";
process.env.LDAP_URL = "ldap://127.0.0.1:389";
process.env.LDAP_BIND_DN = "CN=test";
process.env.LDAP_BIND_CREDENTIALS = "test";
process.env.LDAP_SEARCH_BASE = "DC=test";
process.env.SCHEDULE_API_URL = "https://example.invalid";
process.env.SCHEDULE_API_BEARER_TOKEN = "test";
process.env.CACHE_STALE_TTL_SEC = "3600";

const redisModule = require("../src/redis");
const originalGetRedis = redisModule.getRedis;
const store = new Map();

const fakeRedis = {
  async get(key) {
    return store.get(key) ?? null;
  },
  async set(key, value) {
    store.set(key, value);
  },
};

let cache;

before(() => {
  redisModule.getRedis = async () => fakeRedis;
  cache = require("../src/cache");
});

after(() => {
  redisModule.getRedis = originalGetRedis;
  store.clear();
});

it("stores fresh and stale copies after a successful fetch", async () => {
  const result = await cache.cached("faculties", 60, async () => ({
    courses: [{ fac_id: 1 }],
  }));

  assert.deepEqual(result, {
    value: { courses: [{ fac_id: 1 }] },
    stale: false,
  });
  assert.ok(store.has("faculties"));
  assert.ok(store.has("faculties:stale"));
});

it("serves the stale copy when upstream fails and fresh cache expired", async () => {
  const value = { groups: [{ UID: "g1" }] };
  await cache.cached("groups", 60, async () => value);

  // Имитируем истечение обычного TTL.
  store.delete("groups");

  const result = await cache.cached("groups", 60, async () => {
    throw new Error("upstream down");
  });

  assert.deepEqual(result, { value, stale: true });
});

it("rethrows when upstream fails and there is no stale copy", async () => {
  await assert.rejects(
    () =>
      cache.cached("missing", 60, async () => {
        throw new Error("upstream down");
      }),
    /upstream down/,
  );
});

it("does not serve stale data for a non-transient 404", async () => {
  const value = { groups: [{ UID: "g1" }] };
  await cache.cached("groups-404", 60, async () => value);
  store.delete("groups-404");

  const notFound = Object.assign(new Error("not found"), {
    response: { status: 404 },
  });

  await assert.rejects(
    () =>
      cache.cached("groups-404", 60, async () => {
        throw notFound;
      }),
    /not found/,
  );
});

it("serves stale data on force refresh failure", async () => {
  const value = { timetable: [] };
  await cache.cached("schedule", 60, async () => value);

  const result = await cache.refresh("schedule", 60, async () => {
    throw new Error("upstream down");
  });

  assert.deepEqual(result, { value, stale: true });
});
