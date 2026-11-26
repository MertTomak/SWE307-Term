// The Express app: middleware order, routes and the error handler.
// createApp() does not call listen() (contract with the tests, H33); server.ts does.
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler.js";
import { apiRouter } from "./http/routes.js";

export const API_BASE_PATH = "/api/v1";

/** A new app instance with its own rate-limit state. */
export function createApp(): Express {
  const config = env();
  const app = express();

  app.set("trust proxy", config.TRUST_PROXY); // Render runs one proxy in front: TRUST_PROXY=1
  app.disable("x-powered-by");
  app.use(helmet()); // default security headers (A02)
  app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) })); // only the frontend origin (ST-13)
  app.use(express.json({ limit: "20kb" }));

  app.use(API_BASE_PATH, apiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
