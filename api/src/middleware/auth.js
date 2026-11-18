const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.log?.warn("[auth] no token");
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: "ldap-auth-api",
      audience: "mobile",
    });
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      req.log?.info("[auth] token expired");
      return res
        .status(401)
        .json({ success: false, message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    req.log?.warn({ err }, "[auth] invalid token");
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

module.exports = { requireAuth };