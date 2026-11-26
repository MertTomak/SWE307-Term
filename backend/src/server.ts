// Starts the HTTP server and the System Scheduler.
import { createApp, API_BASE_PATH } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { SystemScheduler } from "./jobs/index.js";
import { logger } from "./logger.js";

const config = env();
const app = createApp();
const scheduler = new SystemScheduler();

const server = app.listen(config.PORT, () => {
  logger.info("server.started", { port: config.PORT, basePath: API_BASE_PATH, env: config.NODE_ENV });
  if (config.SCHEDULER_ENABLED) scheduler.start();
});

async function shutdown(signal: string) {
  logger.info("server.stopping", { signal });
  scheduler.stop();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
