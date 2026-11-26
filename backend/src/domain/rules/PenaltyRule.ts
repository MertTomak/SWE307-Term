import { DomainError } from "../errors.js";
import type { ReservationRule, RuleContext, RuleViolation } from "./ReservationRule.js";

/** R4: a user with a running penalty (startsAt <= now < endsAt) cannot make a reservation. */
export class PenaltyRule implements ReservationRule {
  readonly id = "R4" as const;

  check(ctx: RuleContext): RuleViolation | null {
    if (ctx.runningPenaltyEndsAt === null) return null;
    return new DomainError(
      "RULE_R4_ACTIVE_PENALTY",
      "You cannot make reservations while your penalty is running.",
      "R4",
      { penaltyEndsAt: ctx.runningPenaltyEndsAt.toISOString() },
    );
  }
}
