// Entry point of the scheduler jobs. `runSchedulerOnce` is the contract with the
// tests (hand-off H33, backend/tests/README.md).
import { SystemScheduler } from "./SystemScheduler.js";

export { SystemScheduler, SCHEDULER_INTERVAL_MS } from "./SystemScheduler.js";
export { AutoRejectJob, CompleteJob, NoShowJob, ReminderJob } from "./jobs.js";

const scheduler = new SystemScheduler();

/** One scheduler run with the jobs in the order J3, J1, J2, J4. */
export async function runSchedulerOnce(now: Date = new Date()): Promise<void> {
  await scheduler.runOnce(now);
}
