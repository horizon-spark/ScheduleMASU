const express = require("express");
const os = require("os");

function buildHealthRouter() {
  const router = express.Router();
  router.get("/health", (_req, res) =>
    res.json({
      ok: true,
      pid: process.pid,
      uptime: process.uptime(),
      loadavg: os.loadavg(),
    })
  );
  return router;
}

module.exports = { buildHealthRouter };