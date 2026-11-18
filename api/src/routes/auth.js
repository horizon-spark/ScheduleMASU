const express = require("express");
const jwt = require("jsonwebtoken");
const { passport } = require("../ldap");
const { requireAuth } = require("../middleware/auth");
const config = require("../config");

function buildAuthRouter({ loginLimiter }) {
  const router = express.Router();

  router.post("/login", loginLimiter, (req, res, next) => {
    passport.authenticate("ldapauth", { session: false }, (err, user, info) => {
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
            .json({ success: false, message: "LDAP unavailable, retry later" });
        }
        return res
          .status(500)
          .json({ success: false, message: "LDAP error" });
      }

      if (!user) {
        req.log.warn(
          { username: req.body?.username },
          "[LDAP] login failed"
        );
        const msg =
          typeof info === "string"
            ? info
            : (info && info.message) || "Invalid credentials";
        return res.status(401).json({ success: false, message: msg });
      }

      const profile = {
        username: user.sAMAccountName || null,
        displayName: user.displayName || null,
        email: user.mail || null,
      };

      const token = jwt.sign(profile, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: "ldap-auth-api",
        audience: "mobile",
      });

      req.log.info({ username: profile.username }, "[LDAP] login ok");

      return res.json({ success: true, token, user: profile });
    })(req, res, next);
  });

  router.get("/me", requireAuth, (req, res) => {
    return res.json({ success: true, user: req.user });
  });

  return router;
}

module.exports = { buildAuthRouter };