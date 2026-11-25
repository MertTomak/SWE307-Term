// Finds the code under test. The tests are written against the API contract
// (5.8.4) before the backend exists, so each suite is skipped until the code it
// needs is on disk. Once a file exists it is imported normally: an error inside
// it fails the tests, it is never hidden as "skipped".
//
// Contract with the backend (hand-off H33, tests/README.md):
//   src/app.ts         exports the Express app as `app` or `default`, or a `createApp()` function
//   src/jobs/index.ts  exports `runSchedulerOnce(now?: Date)`: one scheduler run, jobs J3, J1, J2, J4
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import type request from "supertest";
import { fullRun } from "../setup/test-db-url.js";

/** Anything supertest can call: the Express app. */
export type App = Parameters<typeof request>[0];

const srcFile = (relative: string) => fileURLToPath(new URL(`../../src/${relative}`, import.meta.url));

export const hasDb = process.env.DATABASE_URL_TEST !== undefined;
const appFile = srcFile("app.ts");
const jobsFile = srcFile("jobs/index.ts");

export type RunSchedulerOnce = (now?: Date) => Promise<unknown>;

/** The Express app, or null when the database or src/app.ts is missing. */
export async function loadApp(): Promise<App | null> {
  if (!hasDb || !existsSync(appFile)) {
    if (fullRun) throw new Error("npm run test:full: src/app.ts (or the test database) is missing.");
    return null;
  }
  const mod: Record<string, unknown> = await import(/* @vite-ignore */ pathToFileURL(appFile).href);
  const candidate = mod.app ?? mod.default ?? mod.createApp;
  if (isExpressApp(candidate)) return candidate;
  if (typeof candidate === "function") {
    const created = await (candidate as () => unknown)();
    if (isExpressApp(created)) return created;
  }
  throw new Error("src/app.ts must export the Express app (`app` or default) or a createApp() function.");
}

/** One scheduler run, or null when the database or src/jobs/index.ts is missing. */
export async function loadScheduler(): Promise<RunSchedulerOnce | null> {
  if (!hasDb || !existsSync(jobsFile)) {
    if (fullRun) throw new Error("npm run test:full: src/jobs/index.ts (or the test database) is missing.");
    return null;
  }
  const mod: Record<string, unknown> = await import(/* @vite-ignore */ pathToFileURL(jobsFile).href);
  if (typeof mod.runSchedulerOnce !== "function") {
    throw new Error("src/jobs/index.ts must export runSchedulerOnce(now?: Date).");
  }
  return mod.runSchedulerOnce as RunSchedulerOnce;
}

function isExpressApp(value: unknown): value is App {
  return typeof value === "function" && typeof (value as { use?: unknown }).use === "function";
}

export const status = { fullRun, hasDb, hasAppFile: existsSync(appFile), hasJobsFile: existsSync(jobsFile) };
