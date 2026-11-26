import { DomainError } from "../errors.js";
import { MAX_DURATION_MINUTES, durationMinutes } from "../time.js";
import type { ReservationRule, RuleContext, RuleViolation } from "./ReservationRule.js";

/** R1: a reservation lasts at most 3 hours. Exactly 3 hours is allowed. */
export class DurationRule implements ReservationRule {
  readonly id = "R1" as const;

  check(ctx: RuleContext): RuleViolation | null {
    const minutes = durationMinutes(ctx.start, ctx.end);
    if (minutes <= MAX_DURATION_MINUTES) return null;
    return new DomainError(
      "RULE_R1_MAX_DURATION",
      `A reservation can last at most ${MAX_DURATION_MINUTES / 60} hours.`,
      "R1",
      { maxMinutes: MAX_DURATION_MINUTES, requestedMinutes: minutes },
    );
  }
}
