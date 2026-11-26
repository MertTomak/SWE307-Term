// UC-02 Search Resources and View Availability (E04-E06), UC-07 Manage Resources (E17-E19).
import { randomBytes, randomInt } from "node:crypto";
import type { Resource, ResourceType, Role } from "@prisma/client";
import { isUniqueViolation } from "../db/errors.js";
import { DomainError } from "../domain/errors.js";
import { campusDay } from "../domain/time.js";
import { repos as defaultRepos, type Repositories } from "../repositories/index.js";
import { logger } from "../logger.js";

const notFound = () => new DomainError("RESOURCE_NOT_FOUND", "Resource not found.");

/** Door codes come from Node's crypto module, never Math.random() (5.8.5.2 A04). */
export const newQrToken = () => randomBytes(24).toString("base64url");
export const newCheckInCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export interface NewResource {
  name: string;
  type: ResourceType;
  location: string;
  capacity: number | null;
  description?: string | null;
}

export type ResourceChanges = Partial<Pick<Resource, "name" | "location" | "capacity" | "description" | "isActive">>;

export class ResourceService {
  constructor(private readonly r: Repositories = defaultRepos) {}

  /** E04 (active only) and E17 (admin, inactive included by default). */
  search(
    filter: { q?: string; type?: ResourceType; minCapacity?: number; includeInactive: boolean },
    page: number,
    pageSize: number,
  ) {
    return this.r.resources.search(filter, (page - 1) * pageSize, pageSize);
  }

  /** E05: an inactive resource is "not found" for everybody except the admin (FR-11). */
  async getVisible(id: string, role: Role): Promise<Resource> {
    const resource = await this.r.resources.findById(id);
    if (!resource || (!resource.isActive && role !== "RESOURCE_ADMIN")) throw notFound();
    return resource;
  }

  /** E06: booked slots of one resource on one campus day; owner data is not returned. */
  async availability(id: string, date: string, role: Role) {
    await this.getVisible(id, role);
    const day = campusDay(date);
    const slots = await this.r.reservations.findBookedSlots(id, day.start, day.end);
    return { resourceId: id, date, slots };
  }

  /** E18: the server generates qrToken and checkInCode; a clash with an existing code is retried. */
  async create(input: NewResource, adminId: string): Promise<Resource> {
    for (let attempt = 1; ; attempt++) {
      try {
        const resource = await this.r.resources.create({
          name: input.name,
          type: input.type,
          location: input.location,
          capacity: input.type === "EQUIPMENT" ? null : input.capacity,
          description: input.description ?? null,
          qrToken: newQrToken(),
          checkInCode: newCheckInCode(),
        });
        logger.info("resource.created", { resourceId: resource.id, adminId });
        return resource;
      } catch (error) {
        const clash = isUniqueViolation(error, "checkInCode") || isUniqueViolation(error, "qrToken");
        if (!clash || attempt >= 20) throw error;
      }
    }
  }

  /** E19: edit or deactivate; `type` cannot change because R5 depends on it. */
  async update(id: string, changes: ResourceChanges, adminId: string): Promise<Resource> {
    const resource = await this.r.resources.findById(id);
    if (!resource) throw notFound();
    if (changes.capacity !== undefined) {
      const needsCapacity = resource.type !== "EQUIPMENT";
      if (needsCapacity && changes.capacity === null) {
        throw validation("capacity", `A ${resource.type} needs a capacity.`);
      }
      if (!needsCapacity && changes.capacity !== null) {
        throw validation("capacity", "EQUIPMENT has no capacity; send null.");
      }
    }
    const updated = await this.r.resources.update(id, changes);
    logger.info("resource.updated", { resourceId: id, adminId, fields: Object.keys(changes) });
    return updated;
  }
}

const validation = (path: string, message: string) =>
  new DomainError("VALIDATION_ERROR", "The request is not valid.", undefined, { fields: [{ path, message }] });
