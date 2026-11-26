const express = require("express");
const { passport } = require("../ldap");
const { requireAuth } = require("../middleware/auth");
const {
  signAccess,
  issueRefresh,
  verifyRefresh,
  isRefreshActive,
  revokeRefresh,
} = require("../auth/tokens");

function buildAuthRouter({ loginLimiter }) {
  const router = express.Router();

  router.post("/login", loginLimiter, (req, res, next) => {
    passport.authenticate("ldapauth", { session: false }, async (err, user, info) => {
      if (err) {
        req.log.error({ err }, "[LDAP] auth error");
        const isTimeout =
          err.code === "ETIMEDOUT" ||
          err.name === "TimeoutError" ||
          /timeout/i.test(err.message || "");
        if (isTimeout) {
          res.set("Retry-After", "5");
          return res
            .status(503)
            .json({
              success: false,
              code: "LDAP_UNAVAILABLE",
              message: "LDAP unavailable, retry later",
            });
        }
        return res
          .status(500)
          .json({ success: false, code: "LDAP_ERROR", message: "LDAP error" });
      }

      if (!user) {
        req.log.warn({ username: req.body?.username }, "[LDAP] login failed");
        const msg =
          typeof info === "string"
            ? info
            : (info && info.message) || "Invalid credentials";
        return res
          .status(401)
          .json({ success: false, code: "INVALID_CREDENTIALS", message: msg });
      }

      const profile = {
        username: user.sAMAccountName || null,
        displayName: user.displayName || null,
        email: user.mail || null,
      };

      try {
        const accessToken = signAccess(profile);
        const refreshToken = await issueRefresh(profile);
        req.log.info({ username: profile.username }, "[LDAP] login ok");
        return res.json({
          success: true,
          accessToken,
          refreshToken,
          expiresIn: 15 * 60, // секунды, для клиента
          user: profile,
        });
      } catch (e) {
        req.log.error({ err: e }, "[auth] token issuance failed");
        return res.status(503).json({
          success: false,
          code: "TOKEN_STORE_UNAVAILABLE",
          message: "Token service unavailable",
        });
      }
    })(req, res, next);
  });

  // Обмен refresh на новую пару. Ротация: старый jti удаляется.
  router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "refreshToken required" });
    }

    let payload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Refresh token expired",
          code: "REFRESH_EXPIRED",
        });
      }
      req.log.warn({ err }, "[auth] invalid refresh token");
      return res
        .status(401)
        .json({
          success: false,
          code: "INVALID_REFRESH",
          message: "Invalid refresh token",
        });
    }

    const active = await isRefreshActive(payload.jti);
    if (active === null) {
      // Redis настроен, но недоступен. Это временная ошибка, а не отзыв
      // токена: клиент не должен разлогиниваться, достаточно повторить позже.
      res.set("Retry-After", "5");
      return res.status(503).json({
        success: false,
        message: "Token service unavailable, retry later",
        code: "TOKEN_STORE_UNAVAILABLE",
      });
    }
    if (!active) {
      // jti уже использован или отозван — возможна кража.
      // В идеале: отозвать все refresh пользователя sub.
      req.log.warn(
        { jti: payload.jti, sub: payload.sub },
        "[auth] refresh reuse detected"
      );
      return res
        .status(401)
        .json({ success: false, message: "Refresh token revoked", code: "REFRESH_REVOKED" });
    }

    // Ротация: удаляем старый, выдаём новый
    await revokeRefresh(payload.jti);

    const profile = { username: payload.sub };
    try {
      const accessToken = signAccess(profile);
      const refreshToken2 = await issueRefresh(profile);
      req.log.info({ username: profile.username }, "[auth] refresh ok");
      return res.json({
        success: true,
        accessToken,
        refreshToken: refreshToken2,
        expiresIn: 15 * 60,
      });
    } catch (e) {
      req.log.error({ err: e }, "[auth] refresh issuance failed");
      return res
        .status(503)
        .json({ success: false, message: "Token service unavailable" });
    }
  });

  // Logout: удаляем refresh. Access остаётся валидным до истечения (15 мин).
  router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "refreshToken required" });
    }
    try {
      const payload = verifyRefresh(refreshToken);
      await revokeRefresh(payload.jti);
      req.log.info({ username: payload.sub }, "[auth] logout");
    } catch (err) {
      // Невалидный refresh на logout — не ошибка клиента, просто отвечаем 204.
      req.log.warn({ err }, "[auth] logout with invalid refresh");
    }
    return res.status(204).end();
  });

  router.get("/me", requireAuth, (req, res) => {
    const { username, displayName, email } = req.user;
    return res.json({
      success: true,
      user: { username, displayName, email },
    });
  });

  return router;
}

module.exports = { buildAuthRouter };