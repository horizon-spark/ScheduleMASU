const { createClient } = require("redis");
const config = require("./config");

let client = null;

async function getRedis() {
  if (!config.redis.url) return null;
  if (client) return client;

  client = createClient({ url: config.redis.url });
  client.on("error", (err) => console.error("[Redis]", err.message));

  try {
    await client.connect();
    console.log("[Redis] connected");
  } catch (err) {
    console.error("[Redis] connection failed:", err.message);
    client = null;
  }
  return client;
}

module.exports = { getRedis };