// UC-05 Check In with QR (E11, 5.8.4.8, R7).
import type { CheckInMethod } from "@prisma/client";
import { isUniqueViolation } from "../db/errors.js";
import { chooseReservationForCheckIn } from "../domain/checkIn.js";
import { DomainError } from "../domain/errors.js";
import { ReservationStateMachine } from "../domain/state/ReservationStateMachine.js";
import { inTransaction as defaultInTransaction, repos as defaultRepos, type Repositories } from "../repositories/index.js";

const alreadyCheckedIn = () => new DomainError("ALREADY_CHECKED_IN", "You have already checked in for this reservation.");

export class CheckInService {
  constructor(
    private readonly r: Repositories = defaultRepos,
    private readonly inTransaction: typeof defaultInTransaction = defaultInTransaction,
  ) {}

  async checkIn(userId: string, method: CheckInMethod, code: string, now: Date) {
    // Step 1: the QR token or the 6-digit code identifies the resource.
    const resource =
      method === "QR_SCAN" ? await this.r.resources.findByQrToken(code) : await this.r.resources.findByCheckInCode(code);
    if (!resource) throw new DomainError("CHECKIN_CODE_INVALID", "This code does not belong to any resource.");

    // Steps 2 and 4: the caller's reservation in the window, or the reason why there is none.
    const candidates = await this.r.reservations.findForCheckIn(userId, resource.id);
    const reservation = chooseReservationForCheckIn(candidates, now);
    const to = ReservationStateMachine.next(reservation.status, "checkIn"); // T8

    // Step 3: CheckIn row and status change together.
    try {
      return await this.inTransaction(async (tx) => {
        const changed = await tx.reservations.transition(reservation.id, "CONFIRMED", to);
        if (!changed) throw alreadyCheckedIn();
        const checkIn = await tx.checkIns.create(reservation.id, method, now);
        const updated = await tx.reservations.findById(reservation.id);
        return { checkIn, reservation: updated! };
      });
    } catch (error) {
      if (isUniqueViolation(error, "reservationId")) throw alreadyCheckedIn(); // FR-36, NFR-09
      throw error;
    }
  }
}
