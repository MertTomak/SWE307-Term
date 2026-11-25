// Direct database access for the tests: empty the tables and create test data
// without going through the API (arrange step of each test).
import bcrypt from "bcryptjs";
import type { ReservationStatus, ResourceType, Role } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";
import { DAY, plus } from "./clock.js";

export { prisma };

/** Password of every user made by createUser. Test data only. */
export const TEST_PASSWORD = "Test-Password-1";
const testPasswordHash = bcrypt.hashSync(TEST_PASSWORD, 4); // low cost: test speed only

let counter = 0;
const next = () => ++counter;

let connectedToTestDb = false;

export async function resetDb(): Promise<void> {
  // Last check before deleting: the live connection must reach a test database.
  if (!connectedToTestDb) {
    const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (!/test/i.test(name)) {
      throw new Error(`Refusing to empty the database "${name}": its name does not contain "test".`);
    }
    connectedToTestDb = true;
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Notification", "CheckIn", "Penalty", "Reservation", "Resource", "User" CASCADE',
  );
}

export async function createUser(role: Role, name?: string) {
  const n = next();
  const email = `${(name ?? role).toLowerCase()}.${n}@campusslot.test`;
  const user = await prisma.user.create({
    data: { email, fullName: name ?? `Test ${role} ${n}`, role, passwordHash: testPasswordHash },
  });
  return { ...user, password: TEST_PASSWORD };
}

export async function createResource(type: ResourceType, overrides: { name?: string; isActive?: boolean; capacity?: number | null } = {}) {
  const n = next();
  return prisma.resource.create({
    data: {
      name: overrides.name ?? `Test ${type} ${n}`,
      type,
      location: "Test Building",
      capacity: overrides.capacity !== undefined ? overrides.capacity : type === "EQUIPMENT" ? null : 20,
      qrToken: `test-qr-token-${n}-${Math.random().toString(36).slice(2, 10)}`,
      checkInCode: String(200000 + n),
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createReservation(data: {
  userId: string;
  resourceId: string;
  start: Date;
  end: Date;
  status: ReservationStatus;
  rejectionReason?: string;
}) {
  return prisma.reservation.create({
    data: {
      userId: data.userId,
      resourceId: data.resourceId,
      startTime: data.start,
      endTime: data.end,
      status: data.status,
      rejectionReason: data.rejectionReason,
    },
  });
}

/** A running 7-day penalty that started at `startsAt`. */
export async function createPenalty(userId: string, startsAt: Date) {
  return prisma.penalty.create({
    data: { userId, reason: "3 NO_SHOW in last 30 days", noShowCount: 3, startsAt, endsAt: plus(startsAt, 7 * DAY) },
  });
}

export const countNotifications = (userId: string, type: string) =>
  prisma.notification.count({ where: { userId, type: type as never } });
