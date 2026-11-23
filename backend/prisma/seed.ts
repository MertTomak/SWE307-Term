// CampusSlot development seed.
// Wipes all tables and inserts demo data: 13 resources, users of every role,
// reservations in all 7 statuses, check-ins, one active penalty and notifications.
// Times are relative to the moment the seed runs, so the demo data stays current.
// Campus time zone is Europe/Istanbul (fixed UTC+3, no DST since 2016).
//
// Run: npm run db:seed   (or automatically after `prisma migrate reset`)
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma, ResourceType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV is production.");
}

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "CampusSlot123!";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const CAMPUS_UTC_OFFSET_HOURS = 3;

const now = new Date();

/** `hour`:00 campus time, `dayOffset` days from today. */
function at(dayOffset: number, hour: number): Date {
  const campusNow = new Date(now.getTime() + CAMPUS_UTC_OFFSET_HOURS * HOUR);
  return new Date(
    Date.UTC(campusNow.getUTCFullYear(), campusNow.getUTCMonth(), campusNow.getUTCDate() + dayOffset, hour) -
      CAMPUS_UTC_OFFSET_HOURS * HOUR,
  );
}
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

/** Deterministic, non-obvious QR token per resource name (stable across reseeds). */
const qrTokenFor = (name: string) =>
  createHash("sha256").update(`campusslot-seed:${name}`).digest("hex").slice(0, 24);

const resourceSeed: Array<{ name: string; type: ResourceType; location: string; capacity: number | null; description?: string }> = [
  { name: "Room A-101", type: "ROOM", location: "Building A, Floor 1", capacity: 40 },
  { name: "Room A-102", type: "ROOM", location: "Building A, Floor 1", capacity: 40 },
  { name: "Room B-201", type: "ROOM", location: "Building B, Floor 2", capacity: 60 },
  { name: "Seminar Room C-01", type: "ROOM", location: "Building C, Ground Floor", capacity: 25 },
  { name: "Study Room L-1", type: "ROOM", location: "Library, Floor 2", capacity: 6 },
  { name: "Computer Lab 1", type: "LAB", location: "Engineering Building, Floor 3", capacity: 30 },
  { name: "Computer Lab 2", type: "LAB", location: "Engineering Building, Floor 3", capacity: 30 },
  { name: "Electronics Lab", type: "LAB", location: "Engineering Building, Floor 1", capacity: 20 },
  { name: "Physics Lab", type: "LAB", location: "Science Building, Floor 1", capacity: 24 },
  { name: "Projector P-01", type: "EQUIPMENT", location: "Media Center", capacity: null, description: "Portable full-HD projector" },
  { name: "Laptop L-01", type: "EQUIPMENT", location: "Media Center", capacity: null, description: "Windows laptop with HDMI adapter" },
  { name: "Camera C-01", type: "EQUIPMENT", location: "Media Center", capacity: null, description: "DSLR camera with tripod" },
  { name: "VR Headset V-01", type: "EQUIPMENT", location: "Media Center", capacity: null, description: "Standalone VR headset" },
];

async function main() {
  // Wipe in dependency order.
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.checkIn.deleteMany(),
    prisma.penalty.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const mkUser = (email: string, fullName: string, role: Prisma.UserCreateInput["role"]) =>
    prisma.user.create({ data: { email, fullName, role, passwordHash } });

  const admin = await mkUser("admin@campusslot.test", "Resource Admin", "RESOURCE_ADMIN");
  const staff1 = await mkUser("staff1@campusslot.test", "Academic Staff One", "ACADEMIC_STAFF");
  const staff2 = await mkUser("staff2@campusslot.test", "Academic Staff Two", "ACADEMIC_STAFF");
  const student1 = await mkUser("student1@campusslot.test", "Student One", "STUDENT");
  const student2 = await mkUser("student2@campusslot.test", "Student Two", "STUDENT");
  const student3 = await mkUser("student3@campusslot.test", "Student Three", "STUDENT");
  const student4 = await mkUser("student4@campusslot.test", "Student Four", "STUDENT");

  const r: Record<string, { id: string }> = {};
  for (const [i, res] of resourceSeed.entries()) {
    r[res.name] = await prisma.resource.create({
      data: { ...res, qrToken: qrTokenFor(res.name), checkInCode: String(100001 + i) },
    });
  }

  type Res = Prisma.ReservationUncheckedCreateInput;
  const mkRes = (data: Res) => prisma.reservation.create({ data });

  // COMPLETED, with check-in (R7 window respected).
  const completed = await mkRes({ userId: student1.id, resourceId: r["Room A-101"]!.id, startTime: at(-2, 10), endTime: at(-2, 12), status: "COMPLETED", purpose: "Group study" });
  await prisma.checkIn.create({ data: { reservationId: completed.id, checkedInAt: plus(at(-2, 10), 3 * MIN), method: "QR_SCAN" } });

  // CONFIRMED (ROOM/LAB go straight to CONFIRMED, R5).
  const confirmed = await mkRes({ userId: student1.id, resourceId: r["Computer Lab 1"]!.id, startTime: at(1, 10), endTime: at(1, 12), status: "CONFIRMED", purpose: "Project work" });
  // Exactly 3 hours: R1 upper bound.
  const confirmed3h = await mkRes({ userId: staff1.id, resourceId: r["Physics Lab"]!.id, startTime: at(3, 13), endTime: at(3, 16), status: "CONFIRMED", purpose: "Lab session" });

  // PENDING_APPROVAL (EQUIPMENT, R5).
  const pending = await mkRes({ userId: student2.id, resourceId: r["Projector P-01"]!.id, startTime: at(1, 13), endTime: at(1, 15), status: "PENDING_APPROVAL", purpose: "Club presentation" });

  // EQUIPMENT approved by admin -> CONFIRMED.
  const approved = await mkRes({ userId: staff2.id, resourceId: r["Laptop L-01"]!.id, startTime: at(1, 14), endTime: at(1, 16), status: "CONFIRMED", purpose: "Guest lecture", decidedById: admin.id, decidedAt: plus(now, -HOUR) });

  // REJECTED by admin.
  const rejected = await mkRes({ userId: student2.id, resourceId: r["Camera C-01"]!.id, startTime: at(2, 9), endTime: at(2, 11), status: "REJECTED", purpose: "Video shoot", decidedById: admin.id, decidedAt: plus(now, -2 * HOUR), rejectionReason: "Camera is reserved for an exam recording." });

  // CANCELLED before start (R6).
  const cancelled = await mkRes({ userId: student2.id, resourceId: r["Room B-201"]!.id, startTime: at(1, 9), endTime: at(1, 10), status: "CANCELLED", cancelledAt: plus(now, -30 * MIN) });

  // CHECKED_IN, in progress now.
  const ongoingStart = new Date(Math.floor(now.getTime() / (5 * MIN)) * 5 * MIN - 5 * MIN);
  const checkedIn = await mkRes({ userId: staff1.id, resourceId: r["Electronics Lab"]!.id, startTime: ongoingStart, endTime: plus(ongoingStart, 2 * HOUR), status: "CHECKED_IN", purpose: "Lab demo" });
  await prisma.checkIn.create({ data: { reservationId: checkedIn.id, checkedInAt: plus(ongoingStart, 2 * MIN), method: "MANUAL_CODE" } });

  // NO_SHOW x3 in the last 30 days for student3 -> 7-day penalty (R8, R9).
  const noShowStarts = [at(-10, 11), at(-6, 14), at(-3, 9)];
  const noShows = [];
  for (const start of noShowStarts) {
    noShows.push(await mkRes({ userId: student3.id, resourceId: r["Room A-102"]!.id, startTime: start, endTime: plus(start, HOUR), status: "NO_SHOW" }));
  }
  const penaltyStart = plus(noShowStarts[2]!, 16 * MIN);
  await prisma.penalty.create({ data: { userId: student3.id, reason: "3 NO_SHOW in last 30 days", noShowCount: 3, startsAt: penaltyStart, endsAt: plus(penaltyStart, 7 * DAY) } });

  // A single NO_SHOW (below the R9 threshold).
  const singleNoShow = await mkRes({ userId: student4.id, resourceId: r["Study Room L-1"]!.id, startTime: at(-5, 15), endTime: at(-5, 16), status: "NO_SHOW" });

  await prisma.notification.createMany({
    data: [
      { userId: student1.id, reservationId: confirmed.id, type: "RESERVATION_CONFIRMED", message: "Your reservation for Computer Lab 1 is confirmed." },
      { userId: staff1.id, reservationId: confirmed3h.id, type: "RESERVATION_CONFIRMED", message: "Your reservation for Physics Lab is confirmed." },
      { userId: student2.id, reservationId: pending.id, type: "RESERVATION_PENDING", message: "Your reservation for Projector P-01 is waiting for admin approval." },
      { userId: staff2.id, reservationId: approved.id, type: "RESERVATION_APPROVED", message: "Your reservation for Laptop L-01 was approved." },
      { userId: student2.id, reservationId: rejected.id, type: "RESERVATION_REJECTED", message: "Your reservation for Camera C-01 was rejected: Camera is reserved for an exam recording." },
      { userId: student2.id, reservationId: cancelled.id, type: "RESERVATION_CANCELLED", message: "Your reservation for Room B-201 was cancelled." },
      ...noShows.map((n) => ({ userId: student3.id, reservationId: n.id, type: "NO_SHOW_RECORDED" as const, message: "You did not check in within 15 minutes. The reservation was marked NO_SHOW.", isRead: true })),
      { userId: student3.id, type: "PENALTY_APPLIED", message: "You received 3 NO_SHOW in the last 30 days. You cannot make reservations for 7 days." },
      { userId: student4.id, reservationId: singleNoShow.id, type: "NO_SHOW_RECORDED", message: "You did not check in within 15 minutes. The reservation was marked NO_SHOW." },
    ],
  });

  const counts = await prisma.reservation.groupBy({ by: ["status"], _count: true });
  console.log("Seed complete.");
  console.log(`Users: 7 (password for all: ${process.env.SEED_PASSWORD ? "$SEED_PASSWORD" : SEED_PASSWORD})`);
  console.log(`Resources: ${resourceSeed.length}`);
  console.log("Reservations by status:", Object.fromEntries(counts.map((c) => [c.status, c._count])));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
