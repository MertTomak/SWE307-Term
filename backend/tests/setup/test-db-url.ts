// Decides which database the tests use. The tests only ever touch the database
// in DATABASE_URL_TEST, and only if its name contains "test", because every
// test file empties all tables.
import dotenv from "dotenv";

dotenv.config({ quiet: true });

/** Unreachable URL used when no test database is configured. Nothing connects to it. */
export const NO_TEST_DB_URL = "postgresql://no-test-database@127.0.0.1:1/no_test_database";

export function testDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) return undefined;
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(
      `DATABASE_URL_TEST points to the database "${dbName}". The tests delete all rows, ` +
        `so the database name must contain "test" (for example campusslot_test).`,
    );
  }
  return url;
}
