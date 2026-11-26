import type { Prisma } from "@prisma/client";
import type { Db } from "../db/prisma.js";

const penaltyInclude = { user: { select: { id: true, fullName: true, email: true } } } satisfies Prisma.PenaltyInclude;
export type PenaltyWithUser = Prisma.PenaltyGetPayload<{ include: typeof penaltyInclude }>;

/** A penalty is running when startsAt <= now < endsAt (R4). */
const running = (now: Date): Prisma.PenaltyWhereInput => ({ startsAt: { lte: now }, endsAt: { gt: now } });

export class PenaltyRepository {
  constructor(private readonly db: Db) {}

  /** The running penalty that ends last, or null. */
  findRunning(userId: string, now: Date) {
    return this.db.penalty.findFirst({ where: { userId, ...running(now) }, orderBy: { endsAt: "desc" } });
  }

  create(data: Prisma.PenaltyUncheckedCreateInput) {
    return this.db.penalty.create({ data });
  }

  /** E22. `activeOnly` = running penalties; otherwise all penalties. Sorted by endsAt descending. */
  async list(activeOnly: boolean, now: Date, skip: number, take: number) {
    const where = activeOnly ? running(now) : {};
    const [items, total] = await Promise.all([
      this.db.penalty.findMany({ where, include: penaltyInclude, orderBy: [{ endsAt: "desc" }, { id: "asc" }], skip, take }),
      this.db.penalty.count({ where }),
    ]);
    return { items, total };
  }
}
