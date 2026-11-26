// Strategy pattern (5.7 P1): every reservation rule R1-R4 is its own class with
// this interface. The ReservationService runs them in a fixed order and stops at
// the first violation (5.8.4.7).
import type { DomainError } from "../errors.js";
import type { CampusUserRole } from "../types.js";

/** A refused rule: the error that is sent to the client. */
export type RuleViolation = DomainError;

/**
 * Plain data for the rules. The service loads the counts through repositories
 * (inside the transaction) and passes them in, so the Domain never queries the
 * database itself and has no clock of its own.
 */
export interface RuleContext {
  role: CampusUserRole;
  start: Date;
  end: Date;
  /** Server time (NFR-10). */
  now: Date;
  /** Future PENDING_APPROVAL and CONFIRMED reservations of the user (D1). */
  activeReservationCount: number;
  /** End of the user's running penalty, or null (R4). */
  runningPenaltyEndsAt: Date | null;
  /** Blocking reservations on the same resource that overlap [start, end) (R3, D2). */
  overlappingCount: number;
}

export interface ReservationRule {
  readonly id: "R1" | "R2" | "R3" | "R4";
  /** null = the rule passed. */
  check(ctx: RuleContext): RuleViolation | null;
}
