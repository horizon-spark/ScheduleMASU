const { after, before, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const JWT_SECRET = "test-secret-for-api-tests";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = JWT_SECRET;
// Пустая строка важна: dotenv не перезапишет её значением из .env,
// и config.redis.url останется null — тесты не ходят в реальный Redis.
process.env.REDIS_URL = "";
process.env.LDAP_URL = "ldap://127.0.0.1:389";
process.env.LDAP_BIND_DN = "CN=test";
process.env.LDAP_BIND_CREDENTIALS = "test";
process.env.LDAP_SEARCH_BASE = "DC=test";
process.env.SCHEDULE_API_BEARER_TOKEN = "test-upstream-token";

let app;
let upstream;
let upstreamStatus = 200;
let upstreamRequestId;

function signAccess(overrides = {}) {
  return jwt.sign(
    {
      username: "test",
      displayName: "Тестовый Пользователь",
      email: "test@example.com",
      type: "access",
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: "5m", issuer: "ldap-auth-api", audience: "mobile" }
  );
}

function signRefresh(overrides = {}) {
  return jwt.sign(
    { sub: "test", type: "refresh", jti: randomUUID(), ...overrides },
    JWT_SECRET,
    { expiresIn: "5m", issuer: "ldap-auth-api", audience: "mobile" }
  );
}

before(async () => {
  upstream = http.createServer((req, res) => {
    upstreamRequestId = req.headers["x-request-id"];
    res.setHeader("content-type", "application/json");

    if (upstreamStatus !== 200) {
      res.statusCode = upstreamStatus;
      res.end(JSON.stringify({ success: false }));
      return;
    }

    res.end(
      JSON.stringify({ success: true, update: "2026-11-20 16:43:22" })
    );
  });

  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  process.env.SCHEDULE_API_URL = `http://127.0.0.1:${address.port}`;

  // Важно: config читает env при require, поэтому app создаём после
  // того, как известен порт тестового upstream.
  const { createApp } = require("../src/app");
  app = await createApp();
});

after(async () => {
  await new Promise((resolve) => upstream.close(resolve));
});

it("serves liveness without dependencies", async () => {
  const res = await request(app).get("/health");

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

it("adds security headers and dev CORS", async () => {
  const res = await request(app)
    .get("/health")
    .set("Origin", "http://localhost:8081");

  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["access-control-allow-origin"], "*");
});

it("rejects a schedule request without a token", async () => {
  const res = await request(app).get("/api/update");

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "NO_TOKEN");
});

it("rejects a refresh token used as an access token", async () => {
  const res = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${signRefresh()}`);

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "INVALID_TOKEN");
});

it("proxies the update endpoint and forwards X-Request-Id", async () => {
  upstreamStatus = 200;

  const res = await request(app)
    .get("/api/update")
    .set("Authorization", `Bearer ${signAccess()}`)
    .set("X-Request-Id", "trace-1");

  assert.equal(res.status, 200);
  assert.equal(res.body.update, "2026-11-20 16:43:22");
  assert.equal(upstreamRequestId, "trace-1");
});

it("returns 400 for malformed JSON", async () => {
  const res = await request(app)
    .post("/api/refresh")
    .set("Content-Type", "application/json")
    .send('{"refreshToken"');

  assert.equal(res.status, 400);
  assert.equal(res.body.message, "Bad request");
});

it("rotates a valid refresh token", async () => {
  const res = await request(app)
    .post("/api/refresh")
    .send({ refreshToken: signRefresh() });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(typeof res.body.accessToken, "string");
  assert.equal(typeof res.body.refreshToken, "string");
});

it("preserves profile fields after refresh", async () => {
  const res = await request(app)
    .post("/api/refresh")
    .send({
      refreshToken: signRefresh({
        displayName: "Тестовый Пользователь",
        email: "test@example.com",
      }),
    });

  assert.equal(res.status, 200);

  const access = jwt.verify(res.body.accessToken, JWT_SECRET, {
    issuer: "ldap-auth-api",
    audience: "mobile",
  });
  assert.equal(access.username, "test");
  assert.equal(access.displayName, "Тестовый Пользователь");
  assert.equal(access.email, "test@example.com");

  const me = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${res.body.accessToken}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.displayName, "Тестовый Пользователь");
  assert.equal(me.body.user.email, "test@example.com");
});

it("rejects an invalid refresh token", async () => {
  const res = await request(app)
    .post("/api/refresh")
    .send({ refreshToken: "not-a-token" });

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "INVALID_REFRESH");
});

it("rejects a refresh token without a subject", async () => {
  const token = jwt.sign(
    { type: "refresh", jti: randomUUID() },
    JWT_SECRET,
    { expiresIn: "5m", issuer: "ldap-auth-api", audience: "mobile" }
  );

  const res = await request(app)
    .post("/api/refresh")
    .send({ refreshToken: token });

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "INVALID_REFRESH");
});

it("rejects an expired refresh token", async () => {
  const expired = jwt.sign(
    { sub: "test", type: "refresh", jti: randomUUID() },
    JWT_SECRET,
    {
      expiresIn: -1,
      issuer: "ldap-auth-api",
      audience: "mobile",
    }
  );

  const res = await request(app)
    .post("/api/refresh")
    .send({ refreshToken: expired });

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "REFRESH_EXPIRED");
});

it("accepts logout with a refresh token", async () => {
  const res = await request(app)
    .post("/api/logout")
    .send({ refreshToken: signRefresh() });

  assert.equal(res.status, 204);
});

it("returns the current user for an access token", async () => {
  const res = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${signAccess()}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, "test");
  assert.equal(res.body.user.displayName, "Тестовый Пользователь");
});

it("maps upstream 404 to 404", async () => {
  upstreamStatus = 404;

  const res = await request(app)
    .get("/api/update")
    .set("Authorization", `Bearer ${signAccess()}`);

  assert.equal(res.status, 404);
  upstreamStatus = 200;
});

it("maps upstream auth errors and server errors to 502", async () => {
  upstreamStatus = 401;
  let res = await request(app)
    .get("/api/update")
    .set("Authorization", `Bearer ${signAccess()}`);
  assert.equal(res.status, 502);

  upstreamStatus = 500;
  res = await request(app)
    .get("/api/update")
    .set("Authorization", `Bearer ${signAccess()}`);
  assert.equal(res.status, 502);

  upstreamStatus = 200;
});
