const express = require("express");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const { cached } = require("../cache");
const config = require("../config");

const RE_UID = /^[A-Za-z0-9_-]{1,64}$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const TTL = {
  faculties: 300,
  courses: 300,
  groups: 300,
  schedule: 60,
};

function buildScheduleRouter() {
  const router = express.Router();

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

  // Request-id сквозной: берём req.id (его выставил requestLogger)
  externalApi.interceptors.request.use((cfg) => {
    if (!cfg.headers["X-Request-Id"] && cfg.requestId) {
      cfg.headers["X-Request-Id"] = cfg.requestId;
    }
    return cfg;
  });

  router.get("/faculties", async (req, res) => {
    try {
      const data = await cached("sched:faculties", TTL.faculties, async () => {
        const r = await externalApi.get("/faculties", {
          requestId: req.id,
        });
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, req, res, "faculties");
    }
  });

  router.get("/courses", async (req, res) => {
    try {
      const data = await cached("sched:courses", TTL.courses, async () => {
        const r = await externalApi.get("/courses", { requestId: req.id });
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, req, res, "courses");
    }
  });

  router.get("/faculties/:facId/courses/:courseId/groups", async (req, res) => {
    const { facId, courseId } = req.params;
    if (!RE_ID.test(facId) || !RE_ID.test(courseId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid faculty/course id" });
    }
    const key = `sched:groups:${facId}:${courseId}`;
    try {
      const data = await cached(key, TTL.groups, async () => {
        const r = await externalApi.get(
          `/faculties/${encodeURIComponent(facId)}/courses/${encodeURIComponent(courseId)}/groups`,
          { requestId: req.id }
        );
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, req, res, "groups");
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

    const key = `sched:group:${uid}:${start}:${end}`;
    try {
      const data = await cached(key, TTL.schedule, async () => {
        const r = await externalApi.get(
          `/groups/${encodeURIComponent(uid)}/schedule/${start}/${end}`,
          { requestId: req.id }
        );
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, req, res, "schedule");
    }
  });

  return router;
}

function handleExternalError(err, req, res, resource) {
  const requestId = err.config?.headers?.["X-Request-Id"];
  req.log.error(
    {
      resource,
      requestId,
      code: err.code,
      status: err.response?.status,
      err,
    },
    "[ExternalAPI] error"
  );

  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return res.status(504).json({
      success: false,
      message: "External API timeout, retry later",
    });
  }

  if (err.response) {
    const s = err.response.status;

    if (s === 401 || s === 403) {
      req.log.error(
        { resource },
        "[ExternalAPI] auth failed — check SCHEDULE_API_BEARER_TOKEN"
      );
      return res.status(502).json({
        success: false,
        message: "Upstream auth misconfigured",
      });
    }

    if (s === 404) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

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