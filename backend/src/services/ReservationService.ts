// UC-03 Make Reservation (E07), UC-10 / UC-04 (E08-E10), UC-06 approve or reject (E14-E16).
import type { ReservationStatus, Role } from "@prisma/client";
import { isExclusionViolation } from "../db/errors.js";
import { DomainError } from "../domain/errors.js";
import { firstViolation, initialStatusFor, overlapError } from "../domain/rules/index.js";
import { InvalidStateTransition, ReservationStateMachine, type ReservationEvent } from "../domain/state/ReservationStateMachine.js";
import { canCancelAt } from "../domain/time.js";
import { CAMPUS_USER_ROLES, type CampusUserRole } from "../domain/types.js";
import { logger } from "../logger.js";
import { inTransaction as defaultInTransaction, repos as defaultRepos, type Repositories } from "../repositories/index.js";
import type { AdminReservationWithRelations } from "../repositories/index.js";
import { notificationText, notify } from "./NotificationService.js";

export interface Caller {
  id: string;
  role: Role;
}

export interface NewReservation {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  purpose?: string | null;
}

const notFound = () => new DomainError("RESERVATION_NOT_FOUND", "Reservation not found.");
const isCampusUser = (role: Role): role is CampusUserRole => (CAMPUS_USER_ROLES as readonly Role[]).includes(role);
const about = (r: AdminReservationWithRelations) => ({ reservationId: r.id, resourceName: r.resource.name, startTime: r.startTime });

export class ReservationService {
  constructor(
    private readonly r: Repositories = defaultRepos,
    private readonly inTransaction: typeof defaultInTransaction = defaultInTransaction,
  ) {}

  /** E07: the rule chain of 5.8.4.7 in its fixed order. */
  async create(caller: Caller, input: NewReservation, now: Date) {
    // 0b D3: a Resource Admin does not reserve (the route checks it too).
    if (!isCampusUser(caller.role)) throw new DomainError("FORBIDDEN", "Your role cannot make reservations.");
    // 0c FR-20
    if (input.endTime.getTime() <= input.startTime.getTime()) {
      throw new DomainError("INVALID_TIME_RANGE", "The end time must be after the start time.");
    }
    if (input.startTime.getTime() < now.getTime()) {
      throw new DomainError("START_IN_PAST", "The start time is in the past.");
    }
    // 0d FR-11
    const resource = await this.r.resources.findById(input.resourceId);
    if (!resource) throw new DomainError("RESOURCE_NOT_FOUND", "Resource not found.");
    if (!resource.isActive) throw new DomainError("RESOURCE_INACTIVE", "This resource cannot be booked at the moment.");

    try {
      return await this.inTransaction(async (tx) => {
        // Same user's parallel requests are checked one after the other (R2).
        await tx.users.lockForUpdate(caller.id);
        const [penalty, activeReservationCount, overlappingCount] = await Promise.all([
          tx.penalties.findRunning(caller.id, now),
          tx.reservations.countActiveByUser(caller.id, now),
          tx.reservations.countOverlapping(resource.id, input.startTime, input.endTime),
        ]);
        // Steps 1-4: R1 -> R4 -> R2 -> R3 (Strategy pattern).
        const violation = firstViolation({
          role: caller.role as CampusUserRole,
          start: input.startTime,
          end: input.endTime,
          now,
          activeReservationCount,
          runningPenaltyEndsAt: penalty?.endsAt ?? null,
          overlappingCount,
        });
        if (violation) throw violation;

        // Step 5 R5, step 6 insert + notification (T1 / T2).
        const status = initialStatusFor(resource.type);
        const reservation = await tx.reservations.create({
          userId: caller.id,
          resourceId: resource.id,
          startTime: input.startTime,
          endTime: input.endTime,
          status,
          purpose: input.purpose ?? null,
        });
        const a = { reservationId: reservation.id, resourceName: resource.name, startTime: reservation.startTime };
        if (status === "CONFIRMED") {
          await notify(tx, caller.id, "RESERVATION_CONFIRMED", notificationText.RESERVATION_CONFIRMED(a), reservation.id);
        } else {
          await notify(tx, caller.id, "RESERVATION_PENDING", notificationText.RESERVATION_PENDING(a), reservation.id);
        }
        return reservation;
      });
    } catch (error) {
      // NFR-08: a parallel request inserted first; the exclusion constraint refused this one.
      if (isExclusionViolation(error)) throw overlapError();
      throw error;
    }
  }

  /** E08: the caller's reservations, newest start first. */
  listMine(userId: string, statuses: ReservationStatus[] | undefined, page: number, pageSize: number) {
    return this.r.reservations.findByUser(userId, statuses, (page - 1) * pageSize, pageSize);
  }

  /** E09: the owner or a Resource Admin; anybody else gets 404, not 403 (5.8.4.6). */
  async get(caller: Caller, id: string) {
    const reservation = await this.r.reservations.findById(id);
    if (!reservation || (reservation.userId !== caller.id && caller.role !== "RESOURCE_ADMIN")) throw notFound();
    return reservation;
  }

  /** E10, T6/T7: the owner cancels before the start (R6). */
  async cancel(caller: Caller, id: string, now: Date) {
    const reservation = await this.r.reservations.findById(id);
    if (!reservation || reservation.userId !== caller.id) throw notFound();
    const to = ReservationStateMachine.next(reservation.status, "cancel");
    if (!canCancelAt(reservation.startTime, now)) {
      throw new DomainError(
        "RULE_R6_CANCEL_AFTER_START",
        "A reservation can only be cancelled before its start time.",
        "R6",
      );
    }
    return this.applyTransition(reservation, "cancel", to, { cancelledAt: now }, async (tx) => {
      await notify(tx, reservation.userId, "RESERVATION_CANCELLED", notificationText.RESERVATION_CANCELLED(about(reservation)), reservation.id);
    });
  }

  /** E14: equipment reservations waiting for a decision, most urgent first. */
  listPending(page: number, pageSize: number) {
    return this.r.reservations.findPendingApproval((page - 1) * pageSize, pageSize);
  }

  /** E15, T3. */
  async approve(adminId: string, id: string, now: Date) {
    const reservation = await this.loadForDecision(id, "approve", now);
    const result = await this.applyTransition(reservation, "approve", "CONFIRMED", { decidedById: adminId, decidedAt: now }, async (tx) => {
      await notify(tx, reservation.userId, "RESERVATION_APPROVED", notificationText.RESERVATION_APPROVED(about(reservation)), reservation.id);
    });
    logger.security("admin.approve", { adminId, reservationId: id });
    return result;
  }

  /** E16, T4. */
  async reject(adminId: string, id: string, reason: string, now: Date) {
    const reservation = await this.loadForDecision(id, "reject", now);
    const result = await this.applyTransition(
      reservation,
      "reject",
      "REJECTED",
      { decidedById: adminId, decidedAt: now, rejectionReason: reason },
      async (tx) => {
        await notify(tx, reservation.userId, "RESERVATION_REJECTED", notificationText.RESERVATION_REJECTED(about(reservation), reason), reservation.id);
      },
    );
    logger.security("admin.reject", { adminId, reservationId: id });
    return result;
  }

  /** Status check first (409), then the start time (422 RESERVATION_ALREADY_STARTED; D4: the scheduler decides then). */
  private async loadForDecision(id: string, event: ReservationEvent, now: Date) {
    const reservation = await this.r.reservations.findById(id);
    if (!reservation) throw notFound();
    ReservationStateMachine.next(reservation.status, event);
    if (now.getTime() >= reservation.startTime.getTime()) {
      throw new DomainError(
        "RESERVATION_ALREADY_STARTED",
        "The start time has passed. The reservation is rejected automatically.",
      );
    }
    return reservation;
  }

  /** Conditional update + side effects in one transaction; a concurrent change answers 409. */
  private async applyTransition(
    reservation: AdminReservationWithRelations,
    event: ReservationEvent,
    to: ReservationStatus,
    data: Parameters<Repositories["reservations"]["transition"]>[3],
    sideEffects: (tx: Repositories) => Promise<void>,
  ) {
    return this.inTransaction(async (tx) => {
      const changed = await tx.reservations.transition(reservation.id, reservation.status, to, data);
      if (!changed) {
        const current = await tx.reservations.findById(reservation.id);
        throw new InvalidStateTransition(current?.status ?? reservation.status, event);
      }
      await sideEffects(tx);
      const updated = await tx.reservations.findById(reservation.id);
      return updated!;
    });
  }
}
