// Usage report formulas of E20 (5.8.4.10). Pure function over the reservations of one resource.
import { HOUR_MS } from "./time.js";
import type { ReservationStatus } from "./types.js";

/** Statuses counted in `reservationCount` and `bookedHours`. */
export const REPORTED_STATUSES: readonly ReservationStatus[] = ["CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"];
/** Statuses whose start has passed and that tell whether the user came (divisor of noShowRate). */
const DUE_STATUSES: readonly ReservationStatus[] = ["CHECKED_IN", "COMPLETED", "NO_SHOW"];

export interface UsageFigures {
  reservationCount: number;
  bookedHours: number;
  noShowCount: number;
  occupancyRate: number;
  noShowRate: number | null;
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function usageFigures(
  reservations: ReadonlyArray<{ status: ReservationStatus; startTime: Date; endTime: Date }>,
  days: number,
  openingHoursPerDay: number,
): UsageFigures {
  const counted = reservations.filter((r) => REPORTED_STATUSES.includes(r.status));
  const bookedHours = counted.reduce((sum, r) => sum + (r.endTime.getTime() - r.startTime.getTime()) / HOUR_MS, 0);
  const noShowCount = counted.filter((r) => r.status === "NO_SHOW").length;
  const due = counted.filter((r) => DUE_STATUSES.includes(r.status)).length;
  const available = days * openingHoursPerDay;
  return {
    reservationCount: counted.length,
    bookedHours: round(bookedHours, 2),
    noShowCount,
    occupancyRate: available > 0 ? round(bookedHours / available, 4) : 0,
    noShowRate: due > 0 ? round(noShowCount / due, 4) : null,
  };
}
