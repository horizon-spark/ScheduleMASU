const express = require("express");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const { cached, setJson } = require("../cache");
const config = require("../config");

const RE_UID = /^[A-Za-z0-9_-]{1,64}$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const TTL = {
  faculties: 300,
  courses: 300,
  groups: 300,
  buildings: 600,
  rooms: 600,
  teachers: 600,
  teacherSearch: 300,
  subgroups: 300,
  dates: 60,
  schedule: 60,
  update: 30,
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

  function fetchUpstream(req, path, params) {
    return externalApi
      .get(path, { params, requestId: req.id })
      .then((r) => r.data);
  }

  /**
   * Отдаёт данные из Redis-кеша. `?fresh=1` игнорирует кеш и обновляет его —
   * нужно для pull-to-refresh на клиенте.
   */
  async function load(req, { key, ttl, path, params }) {
    const fetcher = () => fetchUpstream(req, path, params);

    if (req.query.fresh !== "1") {
      return cached(key, ttl, fetcher);
    }

    const value = await fetcher();
    if (value !== undefined && value !== null) {
      await setJson(key, value, ttl);
    }
    return value;
  }

  async function respond(req, res, resource, options) {
    try {
      const data = await load(req, options);
      return res.json(data);
    } catch (err) {
      return handleExternalError(err, req, res, resource);
    }
  }

  function badRequest(res, message) {
    return res.status(400).json({ success: false, message });
  }

  function validateRange(start, end) {
    if (!RE_DATE.test(start) || !RE_DATE.test(end)) {
      return "Invalid date range";
    }
    if (start > end) {
      return "start must be <= end";
    }
    return null;
  }

  // ── Институты, курсы, группы ──────────────────────────────
  router.get("/faculties", (req, res) =>
    respond(req, res, "faculties", {
      key: "sched:faculties",
      ttl: TTL.faculties,
      path: "/faculties",
    })
  );

  router.get("/courses", (req, res) =>
    respond(req, res, "courses", {
      key: "sched:courses",
      ttl: TTL.courses,
      path: "/courses",
    })
  );

  router.get("/faculties/:facId/groups", (req, res) => {
    const { facId } = req.params;
    if (!RE_ID.test(facId)) {
      return badRequest(res, "Invalid faculty id");
    }
    return respond(req, res, "groups", {
      key: `sched:groups:fac:${facId}`,
      ttl: TTL.groups,
      path: `/faculties/${encodeURIComponent(facId)}/groups`,
    });
  });

  router.get("/faculties/:facId/groups/main", (req, res) => {
    const { facId } = req.params;
    if (!RE_ID.test(facId)) {
      return badRequest(res, "Invalid faculty id");
    }
    return respond(req, res, "groups", {
      key: `sched:groups:fac:${facId}:main`,
      ttl: TTL.groups,
      path: `/faculties/${encodeURIComponent(facId)}/groups/main`,
    });
  });

  router.get("/faculties/:facId/courses/:courseId/groups", (req, res) => {
    const { facId, courseId } = req.params;
    if (!RE_ID.test(facId) || !RE_ID.test(courseId)) {
      return badRequest(res, "Invalid faculty/course id");
    }
    return respond(req, res, "groups", {
      key: `sched:groups:${facId}:${courseId}`,
      ttl: TTL.groups,
      path:
        `/faculties/${encodeURIComponent(facId)}` +
        `/courses/${encodeURIComponent(courseId)}/groups`,
    });
  });

  router.get("/faculties/:facId/courses/:courseId/groups/main", (req, res) => {
    const { facId, courseId } = req.params;
    if (!RE_ID.test(facId) || !RE_ID.test(courseId)) {
      return badRequest(res, "Invalid faculty/course id");
    }
    return respond(req, res, "groups", {
      key: `sched:groups:${facId}:${courseId}:main`,
      ttl: TTL.groups,
      path:
        `/faculties/${encodeURIComponent(facId)}` +
        `/courses/${encodeURIComponent(courseId)}/groups/main`,
    });
  });

  router.get("/groups/:uid/subgroups", (req, res) => {
    const { uid } = req.params;
    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid group uid");
    }
    return respond(req, res, "subgroups", {
      key: `sched:subgroups:${uid}`,
      ttl: TTL.subgroups,
      path: `/groups/${encodeURIComponent(uid)}/subgroups`,
    });
  });

  // ── Корпуса и аудитории ───────────────────────────────────
  router.get("/buildings", (req, res) =>
    respond(req, res, "buildings", {
      key: "sched:buildings",
      ttl: TTL.buildings,
      path: "/buildings",
    })
  );

  router.get("/buildings/:buiId/rooms", (req, res) => {
    const { buiId } = req.params;
    if (!RE_ID.test(buiId)) {
      return badRequest(res, "Invalid building id");
    }
    return respond(req, res, "rooms", {
      key: `sched:rooms:${buiId}`,
      ttl: TTL.rooms,
      path: `/buildings/${encodeURIComponent(buiId)}/rooms`,
    });
  });

  // ── Преподаватели ─────────────────────────────────────────
  router.get("/teachers", (req, res) =>
    respond(req, res, "teachers", {
      key: "sched:teachers",
      ttl: TTL.teachers,
      path: "/teachers",
    })
  );

  router.get("/teachers/search", (req, res) => {
    // Повторяющийся ?name=... приходит массивом — отбрасываем такие запросы
    const raw = req.query.name;
    const name = typeof raw === "string" ? raw.trim() : "";

    if (name.length < 2) {
      return badRequest(res, "name must be at least 2 characters");
    }
    if (name.length > 100) {
      return badRequest(res, "name must be at most 100 characters");
    }

    return respond(req, res, "teachers", {
      key: `sched:teachers:search:${encodeURIComponent(name.toLowerCase())}`,
      ttl: TTL.teacherSearch,
      path: "/teachers/search",
      params: { name },
    });
  });

  // ── Расписание группы ─────────────────────────────────────
  router.get("/groups/:uid/dates", (req, res) => {
    const { uid } = req.params;
    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid group uid");
    }
    return respond(req, res, "dates", {
      key: `sched:dates:group:${uid}`,
      ttl: TTL.dates,
      path: `/groups/${encodeURIComponent(uid)}/dates`,
    });
  });

  router.get("/groups/:uid/schedule/today", (req, res) => {
    const { uid } = req.params;
    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid group uid");
    }
    return respond(req, res, "schedule", {
      key: `sched:group:${uid}:today`,
      ttl: TTL.schedule,
      path: `/groups/${encodeURIComponent(uid)}/schedule/today`,
    });
  });

  router.get("/groups/:uid/schedule/:start/:end", (req, res) => {
    const { uid, start, end } = req.params;

    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid group uid");
    }

    const rangeError = validateRange(start, end);
    if (rangeError) {
      return badRequest(res, rangeError);
    }

    return respond(req, res, "schedule", {
      key: `sched:group:${uid}:${start}:${end}`,
      ttl: TTL.schedule,
      path:
        `/groups/${encodeURIComponent(uid)}/schedule/` +
        `${start}/${end}`,
    });
  });

  // ── Расписание преподавателя ──────────────────────────────
  router.get("/teachers/:uid/dates", (req, res) => {
    const { uid } = req.params;
    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid teacher uid");
    }
    return respond(req, res, "dates", {
      key: `sched:dates:teacher:${uid}`,
      ttl: TTL.dates,
      path: `/teachers/${encodeURIComponent(uid)}/dates`,
    });
  });

  router.get("/teachers/:uid/schedule/today", (req, res) => {
    const { uid } = req.params;
    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid teacher uid");
    }
    return respond(req, res, "schedule", {
      key: `sched:teacher:${uid}:today`,
      ttl: TTL.schedule,
      path: `/teachers/${encodeURIComponent(uid)}/schedule/today`,
    });
  });

  router.get("/teachers/:uid/schedule/:start/:end", (req, res) => {
    const { uid, start, end } = req.params;

    if (!RE_UID.test(uid)) {
      return badRequest(res, "Invalid teacher uid");
    }

    const rangeError = validateRange(start, end);
    if (rangeError) {
      return badRequest(res, rangeError);
    }

    return respond(req, res, "schedule", {
      key: `sched:teacher:${uid}:${start}:${end}`,
      ttl: TTL.schedule,
      path:
        `/teachers/${encodeURIComponent(uid)}/schedule/` +
        `${start}/${end}`,
    });
  });

  // ── Расписание аудитории ──────────────────────────────────
  router.get("/rooms/:roomId/schedule/:start/:end", (req, res) => {
    const { roomId, start, end } = req.params;

    if (!RE_ID.test(roomId)) {
      return badRequest(res, "Invalid room id");
    }

    const rangeError = validateRange(start, end);
    if (rangeError) {
      return badRequest(res, rangeError);
    }

    return respond(req, res, "schedule", {
      key: `sched:room:${roomId}:${start}:${end}`,
      ttl: TTL.schedule,
      path:
        `/rooms/${encodeURIComponent(roomId)}/schedule/` +
        `${start}/${end}`,
    });
  });

  // ── Служебное ─────────────────────────────────────────────
  // Дата последнего обновления расписания на upstream (GET /)
  router.get("/update", (req, res) =>
    respond(req, res, "update", {
      key: "sched:update",
      ttl: TTL.update,
      path: "/",
    })
  );

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
