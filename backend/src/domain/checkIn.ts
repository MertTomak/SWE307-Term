// R7 check-in decision (5.8.4.8, DT-2 rules DT2-1 to DT2-3). Pure function:
// gets the caller's reservations on the scanned resource and the server time.
import { DomainError } from "./errors.js";
import { checkInWindow, isInCheckInWindow } from "./time.js";
import type { ReservationStatus } from "./types.js";

export interface CheckInCandidate {
  id: string;
  status: ReservationStatus;
  startTime: Date;
  endTime: Date;
}

/** The reservation to check in, or the reason why none can be (FR-37), in the order of 5.8.4.8 step 4. */
export function chooseReservationForCheckIn<T extends CheckInCandidate>(reservations: readonly T[], now: Date): T {
  const byStartDistance = (a: T, b: T) =>
    Math.abs(a.startTime.getTime() - now.getTime()) - Math.abs(b.startTime.getTime() - now.getTime());

  const inWindow = reservations
    .filter((r) => r.status === "CONFIRMED" && isInCheckInWindow(r.startTime, now))
    .sort(byStartDistance);
  if (inWindow[0]) return inWindow[0];

  if (reservations.some((r) => r.status === "CHECKED_IN" && r.endTime.getTime() > now.getTime())) {
    throw new DomainError("ALREADY_CHECKED_IN", "You have already checked in for this reservation.");
  }

  const upcoming = reservations
    .filter((r) => r.status === "CONFIRMED" && checkInWindow(r.startTime).opensAt.getTime() > now.getTime())
    .sort(byStartDistance);
  if (upcoming[0]) {
    const { opensAt } = checkInWindow(upcoming[0].startTime);
    return tooEarly(opensAt);
  }

  if (reservations.some((r) => r.status === "CONFIRMED" && checkInWindow(r.startTime).closesAt.getTime() < now.getTime())) {
    throw new DomainError(
      "RULE_R7_TOO_LATE",
      "The check-in window closed 15 minutes after the start of your reservation.",
      "R7",
    );
  }

  if (reservations.some((r) => r.status === "PENDING_APPROVAL")) {
    throw new DomainError(
      "RESERVATION_NOT_CONFIRMED",
      "Your reservation is still waiting for the Resource Admin's approval.",
      "R5",
    );
  }

  throw new DomainError("NO_RESERVATION_HERE", "You have no reservation for this resource at this time.");
}

function tooEarly(opensAt: Date): never {
  throw new DomainError(
    "RULE_R7_TOO_EARLY",
    "Check-in opens 10 minutes before the start of your reservation.",
    "R7",
    { windowOpensAt: opensAt.toISOString() },
  );
}
