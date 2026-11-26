import { DomainError } from "../errors.js";
import type { CampusUserRole } from "../types.js";
import type { ReservationRule, RuleContext, RuleViolation } from "./ReservationRule.js";

/** R2: maximum number of active (future) reservations per role. */
export const ACTIVE_RESERVATION_LIMITS: Readonly<Record<CampusUserRole, number>> = {
  STUDENT: 2,
  ACADEMIC_STAFF: 5,
};

const ROLE_LABEL: Record<CampusUserRole, string> = { STUDENT: "A student", ACADEMIC_STAFF: "An academic staff member" };

/** R2: active reservations (D1) must stay below the limit of the role. */
export class ActiveLimitRule implements ReservationRule {
  readonly id = "R2" as const;

  check(ctx: RuleContext): RuleViolation | null {
    const limit = ACTIVE_RESERVATION_LIMITS[ctx.role];
    if (ctx.activeReservationCount < limit) return null;
    return new DomainError(
      "RULE_R2_ACTIVE_LIMIT",
      `You already have ${ctx.activeReservationCount} active reservations. ${ROLE_LABEL[ctx.role]} can have at most ${limit}.`,
      "R2",
      { limit, active: ctx.activeReservationCount },
    );
  }
}
