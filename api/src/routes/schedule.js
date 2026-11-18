const express = require("express");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const config = require("../config");

function buildScheduleRouter() {
  const router = express.Router();

  // Все маршруты ниже требуют валидный JWT
  router.use(requireAuth);

  // Клиент axios для внешнего API с таймаутом и защитой от больших ответов
  const externalApi = axios.create({
    baseURL: config.scheduleApi.url,
    timeout: config.scheduleApi.timeout,
    maxContentLength: 5 * 1024 * 1024, // 5 MB
    headers: {
      // Bearer-токен внешнего API. Живёт только на сервере.
      Authorization: `Bearer ${config.scheduleApi.bearerToken}`,
      Accept: "application/json",
    },
  });

  router.get("/faculties", async (req, res) => {
    try {
      const { data } = await externalApi.get("/faculties");
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "faculties");
    }
  });

  router.get("/courses", async (req, res) => {
    try {
      const { data } = await externalApi.get("/courses");
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "courses");
    }
  });

  router.get("/faculties/:facId/courses/:courseId/groups", async (req, res) => {
    const { facId, courseId } = req.params;
    try {
      const { data } = await externalApi.get(
        `/faculties/${facId}/courses/${courseId}/groups`
      );
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "groups");
    }
  });

  router.get("/groups/:uid/schedule/:start/:end", async (req, res) => {
    const { uid, start, end } = req.params;
    try {
      const { data } = await externalApi.get(
        `/groups/${uid}/schedule/${start}/${end}`
      );
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "schedule");
    }
  });

  return router;
}

// Единый обработчик ошибок внешнего API
function handleExternalError(err, res, resource) {
  console.error(`[ExternalAPI] ${resource} error:`, err.message);

  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return res.status(504).json({
      success: false,
      message: "External API timeout, retry later",
    });
  }

  if (err.response) {
    // Внешний API ответил ошибкой (4xx/5xx)
    const status = err.response.status >= 500 ? 502 : err.response.status;
    return res.status(status).json({
      success: false,
      message: err.response.data?.message || "External API error",
    });
  }

  return res.status(502).json({
    success: false,
    message: "External API unavailable",
  });
}

module.exports = { buildScheduleRouter };