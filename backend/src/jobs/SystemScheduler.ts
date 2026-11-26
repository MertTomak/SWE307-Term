// The System Scheduler actor (UC-09): runs J3, J1, J2, J4 every 60 seconds
// inside the backend process (5.8.4.9, H15).
import { logger } from "../logger.js";
import { AutoRejectJob, CompleteJob, NoShowJob, ReminderJob, type Job, type JobResult } from "./jobs.js";

export const SCHEDULER_INTERVAL_MS = 60_000;

export class SystemScheduler {
  /** Order inside one run (5.8.4.9): J3, J1, J2, J4. */
  readonly jobs: readonly Job[];
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(jobs?: readonly Job[]) {
    this.jobs = jobs ?? [new AutoRejectJob(), new NoShowJob(), new CompleteJob(), new ReminderJob()];
  }

  /** One run with the server time or a given `now` (tests set the clock, H33). */
  async runOnce(now: Date = new Date()): Promise<JobResult[]> {
    const results: JobResult[] = [];
    for (const job of this.jobs) {
      try {
        results.push(await job.run(now));
      } catch (error) {
        logger.error("scheduler.job_failed", { job: job.name, error: String(error) });
        results.push({ job: job.name, processed: 0, failed: 1 });
      }
    }
    const changed = results.filter((r) => r.processed > 0 || r.failed > 0);
    if (changed.length > 0) logger.info("scheduler.run", { now: now.toISOString(), results: changed });
    return results;
  }

  start(intervalMs = SCHEDULER_INTERVAL_MS): void {
    if (this.timer) return;
    const tick = async () => {
      if (this.running) return; // a slow run is never overlapped by the next one
      this.running = true;
      try {
        await this.runOnce();
      } finally {
        this.running = false;
      }
    };
    void tick(); // catch up right after a start or a wake-up (NFR-14)
    this.timer = setInterval(() => void tick(), intervalMs);
    logger.info("scheduler.started", { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
