import type { Prisma, ResourceType } from "@prisma/client";
import type { Db } from "../db/prisma.js";

export interface ResourceSearch {
  q?: string;
  type?: ResourceType;
  minCapacity?: number;
  includeInactive: boolean;
}

export class ResourceRepository {
  constructor(private readonly db: Db) {}

  async search(filter: ResourceSearch, skip: number, take: number) {
    const where: Prisma.ResourceWhereInput = {
      ...(filter.includeInactive ? {} : { isActive: true }),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.minCapacity !== undefined ? { capacity: { gte: filter.minCapacity } } : {}),
      ...(filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: "insensitive" } },
              { location: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.resource.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip, take }),
      this.db.resource.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.db.resource.findUnique({ where: { id } });
  }

  findByQrToken(qrToken: string) {
    return this.db.resource.findUnique({ where: { qrToken } });
  }

  findByCheckInCode(checkInCode: string) {
    return this.db.resource.findUnique({ where: { checkInCode } });
  }

  findAll(type?: ResourceType) {
    return this.db.resource.findMany({ where: type ? { type } : {}, orderBy: [{ name: "asc" }, { id: "asc" }] });
  }

  create(data: Prisma.ResourceCreateInput) {
    return this.db.resource.create({ data });
  }

  update(id: string, data: Prisma.ResourceUpdateInput) {
    return this.db.resource.update({ where: { id }, data });
  }
}
