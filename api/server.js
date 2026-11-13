require("dotenv").config(); // ← должно быть в самом верху

const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const LdapStrategy = require("passport-ldapauth").Strategy;
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

// ---- Конфигурация из окружения ----
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = Number(process.env.PORT) || 3000;

const LDAP_URL = process.env.LDAP_URL;
const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
const LDAP_BIND_CREDENTIALS = process.env.LDAP_BIND_CREDENTIALS;
const LDAP_SEARCH_BASE = process.env.LDAP_SEARCH_BASE;
const LDAP_SEARCH_FILTER =
  process.env.LDAP_SEARCH_FILTER ||
  "(|(sAMAccountName={{username}})(userPrincipalName={{username}}))";
const LDAP_SEARCH_ATTRIBUTES = (process.env.LDAP_SEARCH_ATTRIBUTES ||
  "displayName,mail,sAMAccountName")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---- Валидация обязательных переменных (fail fast) ----
const required = {
  JWT_SECRET,
  LDAP_URL,
  LDAP_BIND_DN,
  LDAP_BIND_CREDENTIALS,
  LDAP_SEARCH_BASE,
};
const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`[ENV] Missing required variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ---- Middleware ----
app.use(cors());
app.use(bodyParser.json());

// ---- LDAP стратегия ----
passport.use(
  new LdapStrategy({
    server: {
      url: LDAP_URL,
      bindDN: LDAP_BIND_DN,
      bindCredentials: LDAP_BIND_CREDENTIALS,
      searchBase: LDAP_SEARCH_BASE,
      searchFilter: LDAP_SEARCH_FILTER,
      searchAttributes: LDAP_SEARCH_ATTRIBUTES,
    },
    usernameField: "username",
    passwordField: "password",
  }),
);

app.use(passport.initialize());

// ---- Логин ----
app.post("/api/login", (req, res, next) => {
  passport.authenticate("ldapauth", { session: false }, (err, user, info) => {
    if (err) {
      console.error("[LDAP]", err);
      return res.status(500).json({ success: false, message: "LDAP error" });
    }
    if (!user) {
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

    const token = jwt.sign(profile, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ success: true, token, user: profile });
  })(req, res, next);
});

// ---- Защищённый эндпоинт ----
app.get("/api/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ success: false, message: "No token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: payload });
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// ---- Health ----
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server on http://0.0.0.0:${PORT}`);
});