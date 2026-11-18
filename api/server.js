const cluster = require("cluster");
const os = require("os");
const config = require("./src/config");
const logger = require("./src/logger");

const WORKERS =
  config.concurrency > 0 ? config.concurrency : os.availableParallelism();

async function startWorker() {
  const { createApp } = require("./src/app");

  const app = await createApp();
  const server = app.listen(config.port, "0.0.0.0", () => {
    logger.info(
      { port: config.port, env: config.env },
      `[worker ${process.pid}] listening`
    );
  });

  // Таймауты HTTP.
  // keepAliveTimeout/headersTimeout должны быть БОЛЬШЕ, чем таймауты Nginx
  // (proxy_read_timeout 60s), иначе Nginx может получить 502 на переиспользовании сокета.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 30_000;

  // Graceful shutdown.
  const shutdown = (signal) => {
    logger.info({ signal }, `[worker ${process.pid}] closing`);
    server.close(() => process.exit(0));
    // Закрываем простаивающие keep-alive соединения сразу, не ждём keepAliveTimeout
    if (typeof server.closeIdleConnections === "function") {
      server.closeIdleConnections();
    }
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    logger.error({ err }, "[worker] unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "[worker] uncaughtException");
    process.exit(1);
  });
}

if (cluster.isPrimary) {
  logger.info({ workers: WORKERS }, `[primary ${process.pid}] forking`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    logger.error(
      { workerPid: worker.process.pid, code, signal },
      "[primary] worker died — restarting"
    );
    cluster.fork();
  });

  const shutdownPrimary = (signal) => {
    logger.info({ signal }, "[primary] shutting down workers");
    for (const id in cluster.workers) cluster.workers[id].kill("SIGTERM");
    setTimeout(() => process.exit(0), 12_000).unref();
  };
  process.on("SIGTERM", () => shutdownPrimary("SIGTERM"));
  process.on("SIGINT", () => shutdownPrimary("SIGINT"));
} else {
  startWorker().catch((err) => {
    logger.fatal({ err }, "[worker] failed to start");
    process.exit(1);
  });
}