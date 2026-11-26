// Controllers: turn a validated HTTP request into one service call and the
// result into a DTO (5.8.1). The server time is read here, once per request,
// and passed down (NFR-10); the client never sends it.
import type { Request, Response } from "express";
import type { z } from "zod";
import type { CheckInMethod } from "@prisma/client";
import { CAMPUS_TIME_ZONE } from "../../domain/time.js";
import { logger } from "../../logger.js";
import { AuthService } from "../../services/AuthService.js";
import { CheckInService } from "../../services/CheckInService.js";
import { NotificationService } from "../../services/NotificationService.js";
import { ReportService } from "../../services/ReportService.js";
import { ReservationService } from "../../services/ReservationService.js";
import { ResourceService } from "../../services/ResourceService.js";
import {
  toAdminReservationDto,
  toAdminResourceDto,
  toNotificationDto,
  toPage,
  toPenaltyDto,
  toReservationDto,
  toResourceDto,
  toUserDto,
} from "../dto/mappers.js";
import { currentUser } from "../middleware/auth.js";
import { input } from "../middleware/validate.js";
import type * as s from "../schemas/index.js";

type In<T extends z.ZodType> = z.output<T>;
const now = () => new Date();

const auth = new AuthService();
const resources = new ResourceService();
const reservations = new ReservationService();
const checkIns = new CheckInService();
const notifications = new NotificationService();
const reports = new ReportService();

// ── Auth (E01-E03) ──

export async function register(_req: Request, res: Response) {
  const { body } = input<In<typeof s.registerBody>>(res);
  const result = await auth.register(body);
  logger.info("auth.registered", { userId: result.user.id, role: result.user.role });
  res.status(201).json({ token: result.token, expiresIn: result.expiresIn, user: toUserDto(result.user) });
}

export async function login(req: Request, res: Response) {
  const { body } = input<In<typeof s.loginBody>>(res);
  try {
    const result = await auth.login(body.email, body.password);
    res.json({ token: result.token, expiresIn: result.expiresIn, user: toUserDto(result.user) });
  } catch (error) {
    logger.security("login_failed", { ip: req.ip });
    throw error;
  }
}

export async function me(_req: Request, res: Response) {
  const result = await auth.me(currentUser(res).id, now());
  res.json({
    user: toUserDto(result.user),
    activePenalty: result.activePenalty
      ? { reason: result.activePenalty.reason, endsAt: result.activePenalty.endsAt.toISOString() }
      : null,
    activeReservationCount: result.activeReservationCount,
    activeReservationLimit: result.activeReservationLimit,
  });
}

// ── Resources (E04-E06) ──

export async function searchResources(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.resourceSearchQuery>>(res);
  const { items, total } = await resources.search({ ...query, includeInactive: false }, query.page, query.pageSize);
  res.json(toPage(items.map(toResourceDto), query.page, query.pageSize, total));
}

export async function getResource(_req: Request, res: Response) {
  const { params } = input<unknown, unknown, In<typeof s.idParams>>(res);
  res.json(toResourceDto(await resources.getVisible(params.id, currentUser(res).role)));
}

export async function getAvailability(_req: Request, res: Response) {
  const { params, query } = input<unknown, In<typeof s.availabilityQuery>, In<typeof s.idParams>>(res);
  const result = await resources.availability(params.id, query.date, currentUser(res).role);
  res.json({
    resourceId: result.resourceId,
    date: result.date,
    timeZone: CAMPUS_TIME_ZONE,
    bookedSlots: result.slots.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      status: slot.status,
    })),
  });
}

// ── Reservations (E07-E10) ──

export async function createReservation(_req: Request, res: Response) {
  const { body } = input<In<typeof s.createReservationBody>>(res);
  const reservation = await reservations.create(currentUser(res), body, now());
  res.status(201).json(toReservationDto(reservation));
}

export async function myReservations(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.myReservationsQuery>>(res);
  const { items, total } = await reservations.listMine(currentUser(res).id, query.status, query.page, query.pageSize);
  res.json(toPage(items.map(toReservationDto), query.page, query.pageSize, total));
}

export async function getReservation(_req: Request, res: Response) {
  const { params } = input<unknown, unknown, In<typeof s.idParams>>(res);
  const user = currentUser(res);
  const reservation = await reservations.get(user, params.id);
  res.json(user.role === "RESOURCE_ADMIN" ? toAdminReservationDto(reservation) : toReservationDto(reservation));
}

export async function cancelReservation(_req: Request, res: Response) {
  const { params } = input<unknown, unknown, In<typeof s.idParams>>(res);
  res.json(toReservationDto(await reservations.cancel(currentUser(res), params.id, now())));
}

// ── Check-in (E11) ──

export async function checkIn(_req: Request, res: Response) {
  const { body } = input<In<typeof s.checkInBody>>(res);
  const user = currentUser(res);
  try {
    const result = await checkIns.checkIn(user.id, body.method as CheckInMethod, body.code, now());
    res.status(201).json({
      checkIn: { id: result.checkIn.id, checkedInAt: result.checkIn.checkedInAt.toISOString(), method: result.checkIn.method },
      reservation: toReservationDto(result.reservation),
    });
  } catch (error) {
    // The door code itself is never logged (A09).
    logger.security("check_in_failed", { userId: user.id, method: body.method });
    throw error;
  }
}

// ── Notifications (E12, E13) ──

export async function listNotifications(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.notificationsQuery>>(res);
  const result = await notifications.list(currentUser(res).id, query.unreadOnly, query.page, query.pageSize);
  res.json({
    ...toPage(result.items.map(toNotificationDto), query.page, query.pageSize, result.total),
    unreadCount: result.unreadCount,
  });
}

export async function markNotificationRead(_req: Request, res: Response) {
  const { params } = input<unknown, unknown, In<typeof s.idParams>>(res);
  res.json(toNotificationDto(await notifications.markRead(currentUser(res).id, params.id)));
}

// ── Admin: approvals (E14-E16) ──

export async function pendingReservations(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.pageQuery>>(res);
  const { items, total } = await reservations.listPending(query.page, query.pageSize);
  res.json(toPage(items.map(toAdminReservationDto), query.page, query.pageSize, total));
}

export async function approveReservation(_req: Request, res: Response) {
  const { params } = input<unknown, unknown, In<typeof s.idParams>>(res);
  res.json(toReservationDto(await reservations.approve(currentUser(res).id, params.id, now())));
}

export async function rejectReservation(_req: Request, res: Response) {
  const { params, body } = input<In<typeof s.rejectBody>, unknown, In<typeof s.idParams>>(res);
  res.json(toReservationDto(await reservations.reject(currentUser(res).id, params.id, body.reason, now())));
}

// ── Admin: resources (E17-E19) ──

export async function adminSearchResources(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.adminResourceSearchQuery>>(res);
  const { items, total } = await resources.search(query, query.page, query.pageSize);
  res.json(toPage(items.map(toAdminResourceDto), query.page, query.pageSize, total));
}

export async function createResource(_req: Request, res: Response) {
  const { body } = input<In<typeof s.createResourceBody>>(res);
  res.status(201).json(toAdminResourceDto(await resources.create(body, currentUser(res).id)));
}

export async function updateResource(_req: Request, res: Response) {
  const { params, body } = input<In<typeof s.updateResourceBody>, unknown, In<typeof s.idParams>>(res);
  res.json(toAdminResourceDto(await resources.update(params.id, body, currentUser(res).id)));
}

// ── Admin: reports (E20-E22) ──

export async function usageReport(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.usageReportQuery>>(res);
  const report = await reports.usage(query.from, query.to, query.type);
  res.json({ from: report.from, to: report.to, timeZone: CAMPUS_TIME_ZONE, rows: report.rows });
}

export async function noShowReport(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.noShowReportQuery>>(res);
  const { items, total } = await reports.noShows(query.from, query.to, query.page, query.pageSize);
  const rows = items.map((row) => ({ ...row, lastNoShowAt: row.lastNoShowAt.toISOString() }));
  res.json(toPage(rows, query.page, query.pageSize, total));
}

export async function penalties(_req: Request, res: Response) {
  const { query } = input<unknown, In<typeof s.penaltiesQuery>>(res);
  const { items, total } = await reports.penalties(query.active, now(), query.page, query.pageSize);
  res.json(toPage(items.map(toPenaltyDto), query.page, query.pageSize, total));
}

// ── Health (E23) ──

export function health(_req: Request, res: Response) {
  res.json({ status: "ok", time: now().toISOString() });
}
