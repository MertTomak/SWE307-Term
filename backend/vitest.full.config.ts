// Strict run for the real test run of 5.12 (npm run test:full): the test
// database, src/app.ts and src/jobs/index.ts must all exist. A missing piece
// fails the run instead of skipping tests, so "passed" can never mean "skipped".
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      env: { TEST_FULL: "1" },
    },
  }),
);
