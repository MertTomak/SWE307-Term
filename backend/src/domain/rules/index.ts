// The reservation rule chain of E07 (5.8.4.7) and R5.
import { ActiveLimitRule } from "./ActiveLimitRule.js";
import { DurationRule } from "./DurationRule.js";
import { OverlapRule } from "./OverlapRule.js";
import { PenaltyRule } from "./PenaltyRule.js";
import type { ReservationRule, RuleContext, RuleViolation } from "./ReservationRule.js";
import type { ReservationStatus, ResourceType } from "../types.js";

export * from "./ReservationRule.js";
export { ACTIVE_RESERVATION_LIMITS } from "./ActiveLimitRule.js";
export { overlapError } from "./OverlapRule.js";
export { ActiveLimitRule, DurationRule, OverlapRule, PenaltyRule };

/** Fixed order R1 -> R4 -> R2 -> R3 (5.8.4.7, DT-1 in 5.6). */
export const RESERVATION_RULES: readonly ReservationRule[] = [
  new DurationRule(),
  new PenaltyRule(),
  new ActiveLimitRule(),
  new OverlapRule(),
];

/** Runs the rules in order and returns the first violation, or null. */
export function firstViolation(ctx: RuleContext, rules: readonly ReservationRule[] = RESERVATION_RULES): RuleViolation | null {
  for (const rule of rules) {
    const violation = rule.check(ctx);
    if (violation) return violation;
  }
  return null;
}

/** R5: EQUIPMENT needs the Resource Admin's approval; ROOM and LAB are confirmed at once. Never refuses. */
export function initialStatusFor(type: ResourceType): Extract<ReservationStatus, "PENDING_APPROVAL" | "CONFIRMED"> {
  return type === "EQUIPMENT" ? "PENDING_APPROVAL" : "CONFIRMED";
}
