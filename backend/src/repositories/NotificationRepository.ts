import type { NotificationType, Prisma } from "@prisma/client";
import type { Db } from "../db/prisma.js";

export class NotificationRepository {
  constructor(private readonly db: Db) {}

  create(data: { userId: string; type: NotificationType; message: string; reservationId?: string | null }) {
    return this.db.notification.create({ data });
  }

  async listForUser(userId: string, unreadOnly: boolean, skip: number, take: number) {
    const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { isRead: false } : {}) };
    const [items, total, unreadCount] = await Promise.all([
      this.db.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip, take }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount };
  }

  findById(id: string) {
    return this.db.notification.findUnique({ where: { id } });
  }

  markRead(id: string) {
    return this.db.notification.update({ where: { id }, data: { isRead: true } });
  }
}
