const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
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

  externalApi.interceptors.request.use((cfg) => {
    cfg.headers["X-Request-Id"] =
      cfg.headers["X-Request-Id"] || crypto.randomUUID();
    return cfg;
  });

  router.get("/faculties", async (req, res) => {
    try {
      const data = await cached("sched:faculties", TTL.faculties, async () => {
        const r = await externalApi.get("/faculties");
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "faculties");
    }
  });

  router.get("/courses", async (req, res) => {
    try {
      const data = await cached("sched:courses", TTL.courses, async () => {
        const r = await externalApi.get("/courses");
        return r.data;
      });
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
    const key = `sched:groups:${facId}:${courseId}`;
    try {
      const data = await cached(key, TTL.groups, async () => {
        const r = await externalApi.get(
          `/faculties/${encodeURIComponent(facId)}/courses/${encodeURIComponent(courseId)}/groups`
        );
        return r.data;
      });
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

    const key = `sched:group:${uid}:${start}:${end}`;
    try {
      const data = await cached(key, TTL.schedule, async () => {
        const r = await externalApi.get(
          `/groups/${encodeURIComponent(uid)}/schedule/${start}/${end}`
        );
        return r.data;
      });
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, res, "schedule");
    }
  });

  return router;
}

module.exports = { buildScheduleRouter };