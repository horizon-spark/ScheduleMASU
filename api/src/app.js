const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { setupPassport, passport } = require("./ldap");
const { createLimiters } = require("./middleware/rateLimit");
const { buildAuthRouter } = require("./routes/auth");
const { buildHealthRouter } = require("./routes/health");
const { buildScheduleRouter } = require("./routes/schedule");

async function createApp() {
  setupPassport();

  const app = express();

  app.set("trust proxy", 1);

  app.use(cors());
  app.use(bodyParser.json({ limit: "100kb" }));
  app.use(passport.initialize());

  const { loginLimiter, apiLimiter } = await createLimiters();

  app.use(buildHealthRouter());

  // apiLimiter — один раз на весь /api.
  // loginLimiter — только на /api/auth/login (навешивается внутри buildAuthRouter).
  app.use("/api", apiLimiter);
  app.use("/api", buildAuthRouter({ loginLimiter }));
  app.use("/api", buildScheduleRouter());

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