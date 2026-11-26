// Time rules of the project card, with the numbers exactly as written there.
// The Domain has no clock of its own: every function gets `now` from outside
// (server time, NFR-10), so tests can check the exact boundaries.

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** R1: a reservation lasts at most 3 hours (exactly 3 hours is allowed). */
export const MAX_DURATION_MINUTES = 180;
/** R7: the check-in window opens 10 minutes before the start ... */
export const CHECK_IN_OPENS_BEFORE_MINUTES = 10;
/** ... and closes 15 minutes after the start (both ends inclusive, 5.8.4.8). */
export const CHECK_IN_CLOSES_AFTER_MINUTES = 15;
/** R9: 3 NO_SHOW within 30 days give a 7-day penalty. */
export const NO_SHOW_WINDOW_DAYS = 30;
export const NO_SHOWS_FOR_PENALTY = 3;
export const PENALTY_DAYS = 7;

/** Campus time zone (5.8.4.1). Turkey uses UTC+3 all year (no daylight saving time since 2016). */
export const CAMPUS_TIME_ZONE = "Europe/Istanbul";
const CAMPUS_UTC_OFFSET = "+03:00";

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MINUTE_MS);

export const durationMinutes = (start: Date, end: Date) => (end.getTime() - start.getTime()) / MINUTE_MS;

/** R6: a reservation can be cancelled while `now` is before its start. */
export const canCancelAt = (start: Date, now: Date) => now.getTime() < start.getTime();

/** R7: the check-in window of a reservation. */
export function checkInWindow(start: Date): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: addMinutes(start, -CHECK_IN_OPENS_BEFORE_MINUTES),
    closesAt: addMinutes(start, CHECK_IN_CLOSES_AFTER_MINUTES),
  };
}

export function isInCheckInWindow(start: Date, now: Date): boolean {
  const { opensAt, closesAt } = checkInWindow(start);
  return opensAt.getTime() <= now.getTime() && now.getTime() <= closesAt.getTime();
}

/**
 * R8: the latest start time that is a no-show at `now` (start + 15 min < now).
 * Same boundary as the end of the check-in window, so a reservation is never
 * both "open for check-in" and "no-show".
 */
export const noShowStartedBefore = (now: Date) => addMinutes(now, -CHECK_IN_CLOSES_AFTER_MINUTES);

/** R9: the 30-day window, by reservation start time (API-A7). */
export const noShowWindowStart = (now: Date) => new Date(now.getTime() - NO_SHOW_WINDOW_DAYS * DAY_MS);

/** R9: end of a penalty that starts at `startsAt`. */
export const penaltyEndsAt = (startsAt: Date) => new Date(startsAt.getTime() + PENALTY_DAYS * DAY_MS);

/** J4: the reminder is sent when the check-in window opens (start - 10 min <= now < start). */
export const reminderDueUntil = (now: Date) => addMinutes(now, CHECK_IN_OPENS_BEFORE_MINUTES);

/** A calendar day `YYYY-MM-DD` in the campus time zone as [start, end). */
export function campusDay(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${CAMPUS_UTC_OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Days from `from` to `to`, both included (YYYY-MM-DD). */
export const daysInPeriod = (from: string, to: string) =>
  Math.round((campusDay(to).end.getTime() - campusDay(from).start.getTime()) / DAY_MS);

/** "Wed 9 Dec 2026, 10:00" in the campus time zone, for notification texts. */
export function formatCampusTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
