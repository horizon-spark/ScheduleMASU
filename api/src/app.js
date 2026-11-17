const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { setupPassport, passport } = require("./ldap");
const { createLimiters } = require("./middleware/rateLimit");
const { buildAuthRouter } = require("./routes/auth");
const { buildHealthRouter } = require("./routes/health");

async function createApp() {
  setupPassport();

  const app = express();

  // За Nginx: 1 хоп. Нужно для корректного req.ip в rate-limit.
  app.set("trust proxy", 1);

  app.use(cors());
  app.use(bodyParser.json({ limit: "100kb" }));
  app.use(passport.initialize());

  const { loginLimiter, apiLimiter } = await createLimiters();

  app.use(buildHealthRouter());
  app.use("/api", apiLimiter, buildAuthRouter({ loginLimiter }));

  app.use((req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[Unhandled]", err);
    res.status(500).json({ success: false, message: "Internal error" });
  });

  return app;
}

module.exports = { createApp };