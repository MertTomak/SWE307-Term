// Database guarantees that do not need the API (NFR-09, FR-03, FR-31, FR-36).
// These tests run as soon as a test database exists, before the backend code.
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { HOUR, ist, plus } from "./helpers/clock.js";
import { createReservation, createResource, createUser, prisma, resetDb } from "./helpers/db.js";
import { hasDb } from "./helpers/target.js";

/** Expects a unique-constraint violation (Prisma error P2002). */
async function expectUniqueViolation(action: Promise<unknown>) {
  const error = await action.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  expect((error as Prisma.PrismaClientKnownRequestError).code).toBe("P2002");
}

describe.skipIf(!hasDb)("Database constraints (NFR-09)", () => {
  beforeEach(resetDb);

  it("FR-03 an e-mail can be registered only once", async () => {
    const user = await createUser("STUDENT");
    await expectUniqueViolation(
      prisma.user.create({ data: { email: user.email, fullName: "Copy", role: "STUDENT", passwordHash: "x" } }),
    );
  });

  it("FR-31 / NFR-09 door codes (QR token and 6-digit code) are unique", async () => {
    const room = await createResource("ROOM");
    const base = { name: "Copy", type: "ROOM" as const, location: "Test Building", capacity: 10 };
    await expectUniqueViolation(prisma.resource.create({ data: { ...base, qrToken: room.qrToken, checkInCode: "123456" } }));
    await expectUniqueViolation(prisma.resource.create({ data: { ...base, qrToken: "another-token", checkInCode: room.checkInCode } }));
  });

  it("FR-36 / NFR-09 a reservation has at most one check-in (TC-34 step 4 at database level)", async () => {
    const user = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const start = ist("2026-12-07T10:00:00");
    const r = await createReservation({ userId: user.id, resourceId: room.id, start, end: plus(start, HOUR), status: "CHECKED_IN" });
    await prisma.checkIn.create({ data: { reservationId: r.id, method: "QR_SCAN" } });
    await expectUniqueViolation(prisma.checkIn.create({ data: { reservationId: r.id, method: "MANUAL_CODE" } }));
  });
});
