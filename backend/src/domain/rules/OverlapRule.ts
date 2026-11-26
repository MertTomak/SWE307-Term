import { DomainError } from "../errors.js";
import type { ReservationRule, RuleContext, RuleViolation } from "./ReservationRule.js";

/** The error of R3, also used when the database exclusion constraint refuses an insert (NFR-08). */
export const overlapError = () =>
  new DomainError("RULE_R3_OVERLAP", "This time slot is already booked for this resource.", "R3");

/**
 * R3: no blocking reservation (PENDING_APPROVAL, CONFIRMED, CHECKED_IN; D2) on the
 * same resource with existing.start < new.end and existing.end > new.start.
 * Back-to-back slots do not overlap.
 */
export class OverlapRule implements ReservationRule {
  readonly id = "R3" as const;

  check(ctx: RuleContext): RuleViolation | null {
    return ctx.overlappingCount === 0 ? null : overlapError();
  }
}
