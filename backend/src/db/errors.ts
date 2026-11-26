// Recognises the database errors the services turn into API errors.
import { Prisma } from "@prisma/client";

/** Unique constraint violation (Prisma P2002), optionally on a given field. */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (!field) return true;
  return JSON.stringify(error.meta ?? {}).includes(field);
}

/**
 * Violation of the R3 exclusion constraint "Reservation_r3_no_overlap_excl"
 * (PostgreSQL SQLSTATE 23P01). Prisma 7 with a driver adapter does not have its
 * own error code for it, so the SQLSTATE and the constraint name are searched in
 * the error, its cause and its metadata.
 */
export function isExclusionViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth: number): boolean => {
    if (value === null || value === undefined || depth > 6 || seen.has(value)) return false;
    if (typeof value === "string") return value.includes("23P01") || value.includes("Reservation_r3_no_overlap_excl");
    if (typeof value !== "object") return false;
    seen.add(value);
    const record = value as Record<string, unknown>;
    return ["code", "originalCode", "message", "constraint", "meta", "cause", "driverAdapterError"].some((key) =>
      visit(record[key], depth + 1),
    );
  };
  return visit(error, 0);
}
