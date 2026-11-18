const { randomUUID } = require("crypto");
const baseLogger = require("../logger");

function requestLogger(req, res, next) {
  // Берём X-Request-Id от Nginx/клиента, иначе генерим свой.
  // Ограничиваем длину, чтобы клиент не подсунул мегабайтную строку.
  const incoming = req.headers["x-request-id"];
  const requestId =
    (incoming && String(incoming).slice(0, 64)) || randomUUID();

  // Отдаём обратно в ответе — клиент сможет указать его в багрепорте
  res.setHeader("X-Request-Id", requestId);

  // Дочерний логгер с контекстом запроса. Дальше везде используем req.log.
  req.log = baseLogger.child({
    requestId,
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
  });

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    req.log[level](
      { status: res.statusCode, duration },
      "request completed"
    );
  });

  next();
}

module.exports = { requestLogger };