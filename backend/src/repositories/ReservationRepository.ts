import type { Prisma, ReservationStatus, ResourceType } from "@prisma/client";
import type { Db } from "../db/prisma.js";
import { ACTIVE_STATUSES, BLOCKING_STATUSES } from "../domain/types.js";

/** Relations every ReservationDto needs (5.8.4.5). */
export const reservationInclude = {
  resource: { select: { id: true, name: true, type: true, location: true } },
  checkIn: { select: { checkedInAt: true, method: true } },
} satisfies Prisma.ReservationInclude;

/** ReservationDto relations + the owner, for AdminReservationDto. */
export const adminReservationInclude = {
  ...reservationInclude,
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationWithRelations = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;
export type AdminReservationWithRelations = Prisma.ReservationGetPayload<{ include: typeof adminReservationInclude }>;

/** Fields a status change may set together with the new status. */
export type TransitionData = Pick<
  Prisma.ReservationUncheckedUpdateManyInput,
  "decidedById" | "decidedAt" | "rejectionReason" | "cancelledAt"
>;

export class ReservationRepository {
  constructor(private readonly db: Db) {}

  /** R2 / D1: reservations with a start after `now` and status PENDING_APPROVAL or CONFIRMED. */
  countActiveByUser(userId: string, now: Date) {
    return this.db.reservation.count({
      where: { userId, status: { in: [...ACTIVE_STATUSES] }, startTime: { gt: now } },
    });
  }

  /** R3 / D2: blocking reservations on the resource with existing.start < end and existing.end > start. */
  countOverlapping(resourceId: string, start: Date, end: Date) {
    return this.db.reservation.count({
      where: { resourceId, status: { in: [...BLOCKING_STATUSES] }, startTime: { lt: end }, endTime: { gt: start } },
    });
  }

  create(data: Prisma.ReservationUncheckedCreateInput) {
    return this.db.reservation.create({ data, include: reservationInclude });
  }

  findById(id: string) {
    return this.db.reservation.findUnique({ where: { id }, include: adminReservationInclude });
  }

  async findByUser(userId: string, statuses: ReservationStatus[] | undefined, skip: number, take: number) {
    const where: Prisma.ReservationWhereInput = { userId, ...(statuses?.length ? { status: { in: statuses } } : {}) };
    const [items, total] = await Promise.all([
      this.db.reservation.findMany({
        where,
        include: reservationInclude,
        orderBy: [{ startTime: "desc" }, { id: "asc" }],
        skip,
        take,
      }),
      this.db.reservation.count({ where }),
    ]);
    return { items, total };
  }

  async findPendingApproval(skip: number, take: number) {
    const where: Prisma.ReservationWhereInput = { status: "PENDING_APPROVAL" };
    const [items, total] = await Promise.all([
      this.db.reservation.findMany({
        where,
        include: adminReservationInclude,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        skip,
        take,
      }),
      this.db.reservation.count({ where }),
    ]);
    return { items, total };
  }

  /** Blocking reservations of one resource that touch [from, to) (E06, no owner data). */
  findBookedSlots(resourceId: string, from: Date, to: Date) {
    return this.db.reservation.findMany({
      where: { resourceId, status: { in: [...BLOCKING_STATUSES] }, startTime: { lt: to }, endTime: { gt: from } },
      select: { startTime: true, endTime: true, status: true },
      orderBy: { startTime: "asc" },
    });
  }

  /** The caller's reservations on one resource that can matter for a check-in (5.8.4.8). */
  findForCheckIn(userId: string, resourceId: string) {
    return this.db.reservation.findMany({
      where: { userId, resourceId, status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING_APPROVAL"] } },
      include: reservationInclude,
    });
  }

  /**
   * Conditional status change (UPDATE ... WHERE id = ? AND status = ?, 5.8.4.9).
   * Returns false when another request or scheduler run changed the row first.
   */
  async transition(id: string, from: ReservationStatus, to: ReservationStatus, data: TransitionData = {}): Promise<boolean> {
    const { count } = await this.db.reservation.updateMany({ where: { id, status: from }, data: { ...data, status: to } });
    return count === 1;
  }

  // ── Scheduler selections (5.8.4.9). All compare with "before now" so missed runs catch up. ──

  /** J3: PENDING_APPROVAL with startTime <= now. */
  findPendingStartedBy(now: Date) {
    return this.db.reservation.findMany({
      where: { status: "PENDING_APPROVAL", startTime: { lte: now } },
      include: { resource: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  /** J1: CONFIRMED with startTime < `startedBefore` (= now - 15 min). */
  findConfirmedStartedBefore(startedBefore: Date) {
    return this.db.reservation.findMany({
      where: { status: "CONFIRMED", startTime: { lt: startedBefore } },
      include: { resource: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  /** J2: CHECKED_IN with endTime <= now. */
  findCheckedInEndedBy(now: Date) {
    return this.db.reservation.findMany({ where: { status: "CHECKED_IN", endTime: { lte: now } }, orderBy: { endTime: "asc" } });
  }

  /** J4: CONFIRMED with now < startTime <= now + 10 min and no CHECK_IN_REMINDER yet. */
  findReminderDue(now: Date, startsUntil: Date) {
    return this.db.reservation.findMany({
      where: {
        status: "CONFIRMED",
        startTime: { gt: now, lte: startsUntil },
        notifications: { none: { type: "CHECK_IN_REMINDER" } },
      },
      include: { resource: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  /** R9: the user's NO_SHOW reservations that start at or after `since` (API-A7). */
  countNoShowsSince(userId: string, since: Date) {
    return this.db.reservation.count({ where: { userId, status: "NO_SHOW", startTime: { gte: since } } });
  }

  // ── Reports (E20, E21) ──

  findStartingBetween(from: Date, to: Date, statuses: readonly ReservationStatus[], type?: ResourceType) {
    return this.db.reservation.findMany({
      where: {
        startTime: { gte: from, lt: to },
        status: { in: [...statuses] },
        ...(type ? { resource: { type } } : {}),
      },
      select: { resourceId: true, status: true, startTime: true, endTime: true },
    });
  }

  noShowsByUser(from: Date, to: Date) {
    return this.db.reservation.groupBy({
      by: ["userId"],
      where: { status: "NO_SHOW", startTime: { gte: from, lt: to } },
      _count: { _all: true },
      _max: { startTime: true },
    });
  }
}
