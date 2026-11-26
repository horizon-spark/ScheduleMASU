const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { requestLogger } = require("./middleware/requestLogger");
const { setupPassport, passport } = require("./ldap");
const { createLimiters } = require("./middleware/rateLimit");
const { buildAuthRouter } = require("./routes/auth");
const { buildHealthRouter } = require("./routes/health");
const { buildScheduleRouter } = require("./routes/schedule");

async function createApp() {
  setupPassport();

  const app = express();
  app.set("trust proxy", 1);

  app.use(requestLogger);

  app.use(cors());
  app.use(bodyParser.json({ limit: "100kb" }));
  app.use(passport.initialize());

  const { loginLimiter, apiLimiter } = await createLimiters();

  app.use(buildHealthRouter());
  app.use("/api", apiLimiter);
  app.use("/api", buildAuthRouter({ loginLimiter }));
  app.use("/api", buildScheduleRouter());

  app.use((req, res) => {
    req.log.warn("route not found");
    res.status(404).json({ success: false, message: "Not found" });
  });

  app.use((err, req, res, next) => {
    const log = req.log || require("./logger");
    const status = Number(err.status || err.statusCode) || 500;

    if (status >= 500) {
      log.error({ err }, "unhandled error");
      return res
        .status(500)
        .json({ success: false, message: "Internal error" });
    }

    // Ошибки body-parser (битый JSON, превышен лимит) — это ошибка клиента,
    // а не 500. Детали наружу не отдаём.
    log.warn({ err, status }, "request error");
    const message = status === 413 ? "Payload too large" : "Bad request";
    return res.status(status).json({ success: false, message });
  });

  return app;
}

module.exports = { createApp };