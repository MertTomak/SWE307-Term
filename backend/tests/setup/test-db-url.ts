// Decides which database the tests use. Every test file deletes all rows, so
// the tests only ever touch the database in DATABASE_URL_TEST, and only if
//   1. its name contains "test", and
//   2. it is not the same database as DATABASE_URL (the development database).
// helpers/db.ts checks a third time, on the live connection, before deleting.
import dotenv from "dotenv";

dotenv.config({ quiet: true });

// env.ts replaces DATABASE_URL with the test database for the application, and
// process.env is shared by all test files in a worker. Save the developer's
// DATABASE_URL once, before it is replaced, and compare against that copy.
const DEV_URL_KEY = "CAMPUSSLOT_DEV_DATABASE_URL";
if (process.env[DEV_URL_KEY] === undefined) process.env[DEV_URL_KEY] = process.env.DATABASE_URL ?? "";

/** Unreachable URL used when no test database is configured. Nothing connects to it. */
export const NO_TEST_DB_URL = "postgresql://no-test-database@127.0.0.1:1/no_test_database";

/** "Full" run (npm run test:full): nothing may be missing or skipped. */
export const fullRun = process.env.TEST_FULL === "1";

/** host:port/database, the part that decides which database is reached. */
function target(url: string): string {
  const u = new URL(url);
  const host = u.hostname === "127.0.0.1" || u.hostname === "::1" ? "localhost" : u.hostname.toLowerCase();
  return `${host}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
}

export function testDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    if (fullRun) throw new Error("npm run test:full needs DATABASE_URL_TEST (see tests/README.md).");
    return undefined;
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(
      `DATABASE_URL_TEST points to the database "${dbName}". The tests delete all rows, ` +
        `so the database name must contain "test" (for example campusslot_test).`,
    );
  }
  const devUrl = process.env[DEV_URL_KEY];
  if (devUrl && target(devUrl) === target(url)) {
    throw new Error(
      `DATABASE_URL_TEST and DATABASE_URL point to the same database (${target(url)}). ` +
        `The tests delete all rows, so they need a separate test database.`,
    );
  }
  return url;
}
