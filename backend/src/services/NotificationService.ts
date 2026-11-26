// In-app notifications (F4, FR-28 - FR-30). Notifications are written in the
// same transaction as the change that causes them (5.7: no event bus), so a
// status change and its notification are stored together or not at all.
import type { NotificationType } from "@prisma/client";
import { DomainError } from "../domain/errors.js";
import { formatCampusTime } from "../domain/time.js";
import { repos as defaultRepos, type Repositories } from "../repositories/index.js";

interface About {
  reservationId: string;
  resourceName: string;
  startTime: Date;
}

const at = (a: About) => `${a.resourceName} on ${formatCampusTime(a.startTime)}`;

/** The text of each notification type. */
export const notificationText = {
  RESERVATION_CONFIRMED: (a: About) => `Your reservation for ${at(a)} is confirmed.`,
  RESERVATION_PENDING: (a: About) => `Your reservation for ${at(a)} is waiting for the Resource Admin's approval.`,
  RESERVATION_APPROVED: (a: About) => `Your reservation for ${at(a)} was approved.`,
  RESERVATION_REJECTED: (a: About, reason: string) => `Your reservation for ${at(a)} was rejected: ${reason}`,
  RESERVATION_CANCELLED: (a: About) => `Your reservation for ${at(a)} was cancelled.`,
  CHECK_IN_REMINDER: (a: About) =>
    `Check-in for ${at(a)} is open now. Scan the QR code at the door within 15 minutes after the start.`,
  NO_SHOW_RECORDED: (a: About) =>
    `You did not check in for ${at(a)} within 15 minutes. The reservation was marked as a no-show and the resource was released.`,
  PENALTY_APPLIED: (count: number, endsAt: Date) =>
    `You have ${count} no-shows in the last 30 days. You cannot make reservations until ${formatCampusTime(endsAt)}.`,
} satisfies Record<NotificationType, (...args: never[]) => string>;

/** Writes one notification with the given repositories (normally those of the running transaction). */
export function notify(
  r: Pick<Repositories, "notifications">,
  userId: string,
  type: NotificationType,
  message: string,
  reservationId: string | null = null,
) {
  return r.notifications.create({ userId, type, message, reservationId });
}

export class NotificationService {
  constructor(private readonly r: Repositories = defaultRepos) {}

  /** E12: the caller's notifications, newest first, with the unread count. */
  list(userId: string, unreadOnly: boolean, page: number, pageSize: number) {
    return this.r.notifications.listForUser(userId, unreadOnly, (page - 1) * pageSize, pageSize);
  }

  /** E13: mark one of the caller's notifications as read; another user's id answers 404. */
  async markRead(userId: string, id: string) {
    const notification = await this.r.notifications.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new DomainError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    return notification.isRead ? notification : this.r.notifications.markRead(id);
  }
}
