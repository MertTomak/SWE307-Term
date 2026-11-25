// Test clock. Only `Date` is faked, so timers, the database driver and
// supertest keep working. The backend must take the time from JavaScript
// (`new Date()`, `Date.now()`) or from a `now` parameter, never from the
// database (`now()`, `CURRENT_TIMESTAMP`) for R6-R9 (hand-off H33).
import { vi } from "vitest";

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** A time in the campus time zone (Europe/Istanbul, UTC+3 all year). */
export function ist(localDateTime: string): Date {
  return new Date(`${localDateTime}+03:00`);
}

/** Default "now" of the tests: Monday 7 Dec 2026, 08:00 in Istanbul. */
export const TEST_NOW = ist("2026-12-07T08:00:00");

export function setNow(date: Date): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(date);
}

export function realClock(): void {
  vi.useRealTimers();
}

export const plus = (date: Date, ms: number) => new Date(date.getTime() + ms);

/** ISO 8601 with the +03:00 offset, as the API expects (5.8.4.1). */
export function apiTime(date: Date): string {
  return `${new Date(date.getTime() + 3 * HOUR).toISOString().slice(0, 19)}+03:00`;
}
