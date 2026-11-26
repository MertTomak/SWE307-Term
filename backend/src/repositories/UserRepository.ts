import type { Prisma, Role } from "@prisma/client";
import type { Db } from "../db/prisma.js";

export class UserRepository {
  constructor(private readonly db: Db) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  create(data: { email: string; fullName: string; role: Role; passwordHash: string }) {
    return this.db.user.create({ data });
  }

  /**
   * Locks the user's row until the transaction ends, so two parallel requests of
   * the same user are checked against R2 one after the other.
   * Parameterised query (tagged template), never string concatenation (A05).
   */
  async lockForUpdate(id: string): Promise<void> {
    await this.db.$queryRaw<Prisma.JsonValue[]>`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
  }

  findManyByIds(ids: string[]) {
    return this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, email: true } });
  }
}
