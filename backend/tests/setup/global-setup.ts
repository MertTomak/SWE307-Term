// Runs once before all test files: applies the migrations to the test database.
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./test-db-url.js";

export default function setup() {
  const url = testDatabaseUrl();
  if (!url) {
    console.warn(
      "\n[tests] DATABASE_URL_TEST is not set: tests that need a database are skipped. See tests/README.md.\n",
    );
    return;
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
