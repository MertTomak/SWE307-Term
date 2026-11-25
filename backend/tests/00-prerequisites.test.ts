// Prints what the test run could use, so a run with skipped tests explains itself.
// In the strict run (npm run test:full) a missing prerequisite fails this test.
import { describe, expect, it } from "vitest";
import { status } from "./helpers/target.js";

describe("Test prerequisites", () => {
  it("reports the test database and the backend files found", () => {
    const line = (ok: boolean, text: string, missing: string) => `  ${ok ? "yes" : "NO "}  ${text}${ok ? "" : `  -> ${missing}`}`;
    console.info(
      [
        `CampusSlot backend tests: prerequisites (${status.fullRun ? "strict run: npm run test:full" : "normal run: missing parts are skipped"})`,
        line(status.hasDb, "test database (DATABASE_URL_TEST)", "database tests skipped, see tests/README.md"),
        line(status.hasAppFile, "src/app.ts", "API tests skipped until the Express app exists"),
        line(status.hasJobsFile, "src/jobs/index.ts", "scheduler tests skipped until runSchedulerOnce exists"),
      ].join("\n"),
    );
    if (status.fullRun) {
      expect({ hasDb: status.hasDb, hasAppFile: status.hasAppFile, hasJobsFile: status.hasJobsFile }).toEqual({
        hasDb: true,
        hasAppFile: true,
        hasJobsFile: true,
      });
    }
  });
});
