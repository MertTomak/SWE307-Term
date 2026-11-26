// zod schemas of request bodies, queries and path parameters (5.8.4.6).
// Unknown body fields are dropped, so a client can never set status, userId,
// decidedById or event times itself (A08).
import { z } from "zod";

const RESERVATION_STATUSES = ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED"] as const;
const RESOURCE_TYPES = ["ROOM", "LAB", "EQUIPMENT"] as const;

/** ISO 8601 with an offset ("Z" or "+03:00"); a time without an offset is refused (5.8.4.1). */
export const dateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
/** A calendar day in Europe/Istanbul. */
export const isoDate = z.iso.date();
const booleanString = z.enum(["true", "false"]).transform((v) => v === "true");
const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const idParams = z.object({ id: z.string().min(1).max(64) });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Auth ──

/** 8 characters to 72 bytes in UTF-8: bcrypt reads only the first 72 bytes (API-A4). */
const password = z
  .string()
  .min(8, "The password must have at least 8 characters.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "The password can be at most 72 bytes long.");

export const registerBody = z.object({
  fullName: trimmed(2, 100),
  email: z.email().max(254),
  password,
  role: z.enum(["STUDENT", "ACADEMIC_STAFF"]), // nobody registers as RESOURCE_ADMIN (ST-06)
  privacyNoticeAccepted: z.literal(true), // KVKK notice (5.8.5.5, NFR-06)
});

export const loginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(1024),
});

// ── Resources ──

export const resourceSearchQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  type: z.enum(RESOURCE_TYPES).optional(),
  minCapacity: z.coerce.number().int().min(0).optional(),
});

export const adminResourceSearchQuery = resourceSearchQuery.omit({ minCapacity: true }).extend({
  includeInactive: booleanString.default(true),
});

export const availabilityQuery = z.object({ date: isoDate });

const capacity = z.number().int().min(1).max(10_000);

export const createResourceBody = z
  .object({
    name: trimmed(1, 100),
    type: z.enum(RESOURCE_TYPES),
    location: trimmed(1, 200),
    capacity: capacity.nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type !== "EQUIPMENT" && (value.capacity === null || value.capacity === undefined)) {
      ctx.addIssue({ code: "custom", path: ["capacity"], message: `A ${value.type} needs a capacity.` });
    }
    if (value.type === "EQUIPMENT" && value.capacity !== null && value.capacity !== undefined) {
      ctx.addIssue({ code: "custom", path: ["capacity"], message: "EQUIPMENT has no capacity; send null." });
    }
  })
  .transform((value) => ({ ...value, capacity: value.capacity ?? null }));

/** `type` cannot be changed (R5 depends on it), so it is not accepted here. */
export const updateResourceBody = z
  .object({
    name: trimmed(1, 100).optional(),
    location: trimmed(1, 200).optional(),
    capacity: capacity.nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Send at least one field to change.");

// ── Reservations ──

export const createReservationBody = z.object({
  resourceId: z.string().min(1).max(64),
  startTime: dateTime,
  endTime: dateTime,
  purpose: z.string().trim().max(200).nullable().optional(),
});

export const myReservationsQuery = pageQuery.extend({
  status: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = parts.filter((s) => !(RESERVATION_STATUSES as readonly string[]).includes(s));
      if (invalid.length > 0) {
        ctx.addIssue({ code: "custom", message: `Unknown status: ${invalid.join(", ")}` });
        return z.NEVER;
      }
      return parts as (typeof RESERVATION_STATUSES)[number][];
    }),
});

export const rejectBody = z.object({ reason: trimmed(1, 500) });

// ── Check-in ──

export const checkInBody = z
  .object({
    method: z.enum(["QR_SCAN", "MANUAL_CODE"]),
    code: z.string().trim().min(1).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.method === "MANUAL_CODE" && !/^\d{6}$/.test(value.code)) {
      ctx.addIssue({ code: "custom", path: ["code"], message: "The door code has exactly 6 digits." });
    }
  });

// ── Notifications ──

export const notificationsQuery = pageQuery.extend({ unreadOnly: booleanString.default(false) });

// ── Reports ──

const period = z
  .object({ from: isoDate, to: isoDate })
  .refine((v) => v.from <= v.to, { message: "`from` must not be after `to`.", path: ["to"] });

export const usageReportQuery = z
  .object({ from: isoDate, to: isoDate, type: z.enum(RESOURCE_TYPES).optional() })
  .refine((v) => v.from <= v.to, { message: "`from` must not be after `to`.", path: ["to"] });

export const noShowReportQuery = pageQuery.and(period);

export const penaltiesQuery = pageQuery.extend({ active: booleanString.default(true) });
