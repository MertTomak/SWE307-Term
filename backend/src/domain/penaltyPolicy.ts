// R9: 3 NO_SHOW within 30 days give a 7-day penalty (5.8.4.9 J1, DT-2 rules DT2-6, DT2-7).
import { NO_SHOWS_FOR_PENALTY, penaltyEndsAt } from "./time.js";

export interface PenaltyDecision {
  startsAt: Date;
  endsAt: Date;
  noShowCount: number;
  reason: string;
}

/**
 * `noShowsInWindow`: the user's NO_SHOW reservations whose start is in the last
 * 30 days (API-A7), including the one just recorded. A user who already has a
 * running penalty does not get a second one (DT2-6).
 * Open point H09: whether no-shows that already caused a penalty count again.
 */
export function decidePenalty(noShowsInWindow: number, hasRunningPenalty: boolean, now: Date): PenaltyDecision | null {
  if (hasRunningPenalty || noShowsInWindow < NO_SHOWS_FOR_PENALTY) return null;
  return {
    startsAt: now,
    endsAt: penaltyEndsAt(now),
    noShowCount: noShowsInWindow,
    reason: `${noShowsInWindow} NO_SHOW in last 30 days`,
  };
}
