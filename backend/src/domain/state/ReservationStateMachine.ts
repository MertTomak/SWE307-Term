// State pattern, table-driven form (5.7 P2): the allowed transitions of the 7
// reservation statuses in one place. T1-T10 refer to Enes's state machine
// diagram (5.7). HTTP services and scheduler jobs both call next(), so the
// scheduler cannot make a transition that the user interface cannot.
// Guards that need time or data (R6, R7, J1-J4) are checked by the callers.
import { DomainError } from "../errors.js";
import type { ReservationStatus } from "../types.js";

export type ReservationEvent = "approve" | "reject" | "autoReject" | "cancel" | "checkIn" | "noShow" | "complete";

const TRANSITIONS: Readonly<Record<ReservationStatus, Partial<Record<ReservationEvent, ReservationStatus>>>> = {
  PENDING_APPROVAL: { approve: "CONFIRMED", reject: "REJECTED", autoReject: "REJECTED", cancel: "CANCELLED" }, // T3-T6
  CONFIRMED: { cancel: "CANCELLED", checkIn: "CHECKED_IN", noShow: "NO_SHOW" }, // T7-T9
  CHECKED_IN: { complete: "COMPLETED" }, // T10
  COMPLETED: {},
  CANCELLED: {},
  NO_SHOW: {},
  REJECTED: {},
};

export class InvalidStateTransition extends DomainError {
  constructor(
    readonly from: ReservationStatus,
    readonly event: ReservationEvent,
  ) {
    super(
      "INVALID_STATE_TRANSITION",
      `A reservation with status ${from} cannot be changed by "${event}".`,
      undefined,
      { from, action: event },
    );
  }
}

export const ReservationStateMachine = {
  /** The status after `event`, or InvalidStateTransition (409) when the table has no such transition. */
  next(from: ReservationStatus, event: ReservationEvent): ReservationStatus {
    const to = TRANSITIONS[from][event];
    if (!to) throw new InvalidStateTransition(from, event);
    return to;
  },

  can(from: ReservationStatus, event: ReservationEvent): boolean {
    return TRANSITIONS[from][event] !== undefined;
  },

  /** All transitions as [from, event, to] rows, for tests and the class diagram. */
  transitions(): Array<[ReservationStatus, ReservationEvent, ReservationStatus]> {
    return Object.entries(TRANSITIONS).flatMap(([from, events]) =>
      Object.entries(events).map(([event, to]) => [from as ReservationStatus, event as ReservationEvent, to!]),
    );
  },
} as const;
