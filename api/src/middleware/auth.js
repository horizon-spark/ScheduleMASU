const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

module.exports = { requireAuth };