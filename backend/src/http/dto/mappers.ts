// Data Transfer Object + Mapper (5.7 P6, 5.8.4.5). The API never returns a
// database record as it is: passwordHash is never sent, and the door codes
// (qrToken, checkInCode) are copied only by the admin mapper.
import type { Notification, Resource, User } from "@prisma/client";
import type { AdminReservationWithRelations, PenaltyWithUser, ReservationWithRelations } from "../../repositories/index.js";

const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => (d ? d.toISOString() : null);

export const toUserDto = (u: Pick<User, "id" | "email" | "fullName" | "role">) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
});

export const toResourceDto = (r: Resource) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  location: r.location,
  capacity: r.capacity,
  description: r.description,
  isActive: r.isActive,
});

export const toAdminResourceDto = (r: Resource) => ({
  ...toResourceDto(r),
  qrToken: r.qrToken,
  checkInCode: r.checkInCode,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

export const toReservationDto = (r: ReservationWithRelations) => ({
  id: r.id,
  resource: { id: r.resource.id, name: r.resource.name, type: r.resource.type, location: r.resource.location },
  startTime: iso(r.startTime),
  endTime: iso(r.endTime),
  status: r.status,
  purpose: r.purpose,
  rejectionReason: r.rejectionReason,
  decidedAt: isoOrNull(r.decidedAt),
  cancelledAt: isoOrNull(r.cancelledAt),
  checkIn: r.checkIn ? { checkedInAt: iso(r.checkIn.checkedInAt), method: r.checkIn.method } : null,
  createdAt: iso(r.createdAt),
});

export const toAdminReservationDto = (r: AdminReservationWithRelations) => ({
  ...toReservationDto(r),
  user: { id: r.user.id, fullName: r.user.fullName, email: r.user.email },
});

export const toNotificationDto = (n: Notification) => ({
  id: n.id,
  type: n.type,
  message: n.message,
  reservationId: n.reservationId,
  isRead: n.isRead,
  createdAt: iso(n.createdAt),
});

export const toPenaltyDto = (p: PenaltyWithUser) => ({
  id: p.id,
  user: { id: p.user.id, fullName: p.user.fullName, email: p.user.email },
  reason: p.reason,
  noShowCount: p.noShowCount,
  startsAt: iso(p.startsAt),
  endsAt: iso(p.endsAt),
});

export const toPage = <T>(data: T[], page: number, pageSize: number, total: number) => ({ data, page, pageSize, total });
