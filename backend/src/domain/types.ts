// Domain value types. Same values as the project card and the Prisma enums,
// declared here so the Domain layer does not depend on Prisma (5.8.1 layer rule).

export type Role = "STUDENT" | "ACADEMIC_STAFF" | "RESOURCE_ADMIN";
export type CampusUserRole = Exclude<Role, "RESOURCE_ADMIN">;

export type ResourceType = "ROOM" | "LAB" | "EQUIPMENT";

export type ReservationStatus =
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "REJECTED";

export const CAMPUS_USER_ROLES: readonly CampusUserRole[] = ["STUDENT", "ACADEMIC_STAFF"];

/** Statuses that block the time slot of a resource (R3, D2). */
export const BLOCKING_STATUSES: readonly ReservationStatus[] = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"];

/** Statuses that count as "active" for R2 when the start is in the future (D1). */
export const ACTIVE_STATUSES: readonly ReservationStatus[] = ["PENDING_APPROVAL", "CONFIRMED"];
