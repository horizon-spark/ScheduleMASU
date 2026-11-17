const cluster = require("cluster");
const os = require("os");
const config = require("./src/config");

const WORKERS =
  config.concurrency > 0 ? config.concurrency : os.availableParallelism();

async function startWorker() {
  const { createApp } = require("./src/app");

  const app = await createApp();
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `[worker ${process.pid}] listening on :${config.port} (env=${config.env})`
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
    console.log(`[worker ${process.pid}] ${signal} received, closing`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    console.error("[worker] unhandledRejection:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[worker] uncaughtException:", err);
    process.exit(1);
  });
}

if (cluster.isPrimary) {
  console.log(`[primary ${process.pid}] forking ${WORKERS} workers`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `[primary] worker ${worker.process.pid} died (code=${code}, signal=${signal}) — restarting`
    );
    cluster.fork();
  });

  const shutdownPrimary = () => {
    for (const id in cluster.workers) cluster.workers[id].kill("SIGTERM");
    setTimeout(() => process.exit(0), 12_000).unref();
  };
  process.on("SIGTERM", shutdownPrimary);
  process.on("SIGINT", shutdownPrimary);
} else {
  startWorker().catch((err) => {
    console.error("[worker] failed to start:", err);
    process.exit(1);
  });
}