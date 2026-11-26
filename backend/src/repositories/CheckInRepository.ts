import type { CheckInMethod } from "@prisma/client";
import type { Db } from "../db/prisma.js";

export class CheckInRepository {
  constructor(private readonly db: Db) {}

  /** `checkedInAt` is the server time from JavaScript, not the database default (H33). */
  create(reservationId: string, method: CheckInMethod, checkedInAt: Date) {
    return this.db.checkIn.create({ data: { reservationId, method, checkedInAt } });
  }
}
