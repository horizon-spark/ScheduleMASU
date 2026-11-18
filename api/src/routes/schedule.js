const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth");
const config = require("../config");

// Валидаторы параметров пути. Не даём мусору уходить во внешний API.
const RE_UID = /^[A-Za-z0-9_-]{1,64}$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^[A-Za-z0-9_-]{1,64}$/; // facId/courseId — на случай строковых slug'ов

function buildScheduleRouter() {
  const router = express.Router();

  // Все маршруты ниже требуют валидный JWT
  router.use(requireAuth);

  const externalApi = axios.create({
    baseURL: config.scheduleApi.url,
    timeout: config.scheduleApi.timeout,
    maxContentLength: 5 * 1024 * 1024,
    headers: {
      Authorization: `Bearer ${config.scheduleApi.bearerToken}`,
      Accept: "application/json",
    },
  });

  // Request-id для трассировки: свой, если клиент прислал, иначе генерим.
  externalApi.interceptors.request.use((cfg) => {
    cfg.headers["X-Request-Id"] =
      cfg.headers["X-Request-Id"] || crypto.randomUUID();
    return cfg;
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
    if (!RE_ID.test(facId) || !RE_ID.test(courseId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid faculty/course id" });
    }
    try {
      const { data } = await externalApi.get(
        `/faculties/${encodeURIComponent(facId)}/courses/${encodeURIComponent(courseId)}/groups`
      );
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "groups");
    }
  });

  router.get("/groups/:uid/schedule/:start/:end", async (req, res) => {
    const { uid, start, end } = req.params;

    if (!RE_UID.test(uid)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid group uid" });
    }
    if (!RE_DATE.test(start) || !RE_DATE.test(end)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date range" });
    }
    if (start > end) {
      return res
        .status(400)
        .json({ success: false, message: "start must be <= end" });
    }

    try {
      const { data } = await externalApi.get(
        `/groups/${encodeURIComponent(uid)}/schedule/${start}/${end}`
      );
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "schedule");
    }
  });

  return router;
}

// Единый обработчик ошибок внешнего API.
// Внешние ошибки НЕ пробрасываются клиенту как есть — иначе мобилка
// разлогинит пользователя на 401 от внешнего API.
function handleExternalError(err, res, resource) {
  const requestId = err.config?.headers?.["X-Request-Id"];
  console.error(
    `[ExternalAPI] ${resource} error`,
    `requestId=${requestId || "-"}`,
    `code=${err.code || "-"}`,
    `status=${err.response?.status || "-"}`,
    `msg=${err.message}`
  );

  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return res.status(504).json({
      success: false,
      message: "External API timeout, retry later",
    });
  }

  if (err.response) {
    const s = err.response.status;

    // Наш server-side bearer протух / невалиден — это НАША проблема.
    if (s === 401 || s === 403) {
      console.error(
        `[ExternalAPI] auth failed for ${resource} — check SCHEDULE_API_BEARER_TOKEN`
      );
      return res.status(502).json({
        success: false,
        message: "Upstream auth misconfigured",
      });
    }

    // Ресурс реально не найден — это можно отдать клиенту.
    if (s === 404) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // 5xx внешнего API и 400/422 (наши параметры) — для клиента это 502.
    return res.status(502).json({
      success: false,
      message: "External API error",
    });
  }

  return res.status(502).json({
    success: false,
    message: "External API unavailable",
  });
}

module.exports = { buildScheduleRouter };