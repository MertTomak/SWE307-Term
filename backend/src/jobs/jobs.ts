// System Scheduler jobs (UC-09, 5.8.4.9). Each job selects with "before now",
// so reservations that were due while the server was stopped or asleep are
// handled at the next run (NFR-14). Each status change is a conditional update,
// so a reservation is never processed twice. Every reservation is handled in its
// own transaction and its own try, so one bad row does not stop the job (A10).
import { decidePenalty } from "../domain/penaltyPolicy.js";
import { ReservationStateMachine } from "../domain/state/ReservationStateMachine.js";
import { noShowStartedBefore, noShowWindowStart, reminderDueUntil } from "../domain/time.js";
import { logger } from "../logger.js";
import { inTransaction as defaultInTransaction, repos as defaultRepos, type Repositories } from "../repositories/index.js";
import { notificationText, notify } from "../services/NotificationService.js";

type InTransaction = typeof defaultInTransaction;

export interface JobResult {
  job: string;
  processed: number;
  failed: number;
}

export interface Job {
  readonly name: string;
  run(now: Date): Promise<JobResult>;
}

abstract class ReservationJob implements Job {
  abstract readonly name: string;

  constructor(
    protected readonly r: Repositories = defaultRepos,
    protected readonly inTransaction: InTransaction = defaultInTransaction,
  ) {}

  protected async eachRow<T extends { id: string }>(rows: T[], handle: (row: T) => Promise<boolean>): Promise<JobResult> {
    let processed = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        if (await handle(row)) processed++;
      } catch (error) {
        failed++;
        logger.error("scheduler.row_failed", { job: this.name, reservationId: row.id, error: String(error) });
      }
    }
    return { job: this.name, processed, failed };
  }

  abstract run(now: Date): Promise<JobResult>;
}

const about = (r: { id: string; startTime: Date; resource: { name: string } }) => ({
  reservationId: r.id,
  resourceName: r.resource.name,
  startTime: r.startTime,
});

/** J3 (D4, FR-55, T5): PENDING_APPROVAL with startTime <= now becomes REJECTED. */
export class AutoRejectJob extends ReservationJob {
  readonly name = "J3 AutoRejectJob";
  static readonly REASON = "Not approved before the start time";

  async run(now: Date) {
    const rows = await this.r.reservations.findPendingStartedBy(now);
    return this.eachRow(rows, (row) =>
      this.inTransaction(async (tx) => {
        const to = ReservationStateMachine.next(row.status, "autoReject");
        const changed = await tx.reservations.transition(row.id, row.status, to, {
          rejectionReason: AutoRejectJob.REASON,
          decidedById: null,
          decidedAt: now,
        });
        if (changed) {
          await notify(tx, row.userId, "RESERVATION_REJECTED", notificationText.RESERVATION_REJECTED(about(row), AutoRejectJob.REASON), row.id);
        }
        return changed;
      }),
    );
  }
}

/**
 * J1 (R8, R9, T9): CONFIRMED with startTime + 15 min < now becomes NO_SHOW and
 * the resource is free again (R3 ignores NO_SHOW). Then R9 for the user.
 */
export class NoShowJob extends ReservationJob {
  readonly name = "J1 NoShowJob";

  async run(now: Date) {
    const rows = await this.r.reservations.findConfirmedStartedBefore(noShowStartedBefore(now));
    return this.eachRow(rows, (row) =>
      this.inTransaction(async (tx) => {
        const to = ReservationStateMachine.next(row.status, "noShow");
        const changed = await tx.reservations.transition(row.id, row.status, to);
        if (!changed) return false;
        await notify(tx, row.userId, "NO_SHOW_RECORDED", notificationText.NO_SHOW_RECORDED(about(row)), row.id);

        // R9: lock the user so two no-shows of one user in parallel runs give one penalty.
        await tx.users.lockForUpdate(row.userId);
        const [noShows, running] = await Promise.all([
          tx.reservations.countNoShowsSince(row.userId, noShowWindowStart(now)),
          tx.penalties.findRunning(row.userId, now),
        ]);
        const penalty = decidePenalty(noShows, running !== null, now);
        if (penalty) {
          await tx.penalties.create({ userId: row.userId, ...penalty });
          await notify(tx, row.userId, "PENALTY_APPLIED", notificationText.PENALTY_APPLIED(penalty.noShowCount, penalty.endsAt));
          logger.info("scheduler.penalty_applied", { userId: row.userId, noShowCount: penalty.noShowCount });
        }
        return true;
      }),
    );
  }
}

/** J2 (FR-38, T10): CHECKED_IN with endTime <= now becomes COMPLETED. */
export class CompleteJob extends ReservationJob {
  readonly name = "J2 CompleteJob";

  async run(now: Date) {
    const rows = await this.r.reservations.findCheckedInEndedBy(now);
    return this.eachRow(rows, (row) =>
      this.r.reservations.transition(row.id, row.status, ReservationStateMachine.next(row.status, "complete")),
    );
  }
}

/** J4 (FR-30): one CHECK_IN_REMINDER when the check-in window opens (start - 10 min <= now < start). */
export class ReminderJob extends ReservationJob {
  readonly name = "J4 ReminderJob";

  async run(now: Date) {
    const rows = await this.r.reservations.findReminderDue(now, reminderDueUntil(now));
    return this.eachRow(rows, async (row) => {
      await notify(this.r, row.userId, "CHECK_IN_REMINDER", notificationText.CHECK_IN_REMINDER(about(row)), row.id);
      return true;
    });
  }
}
