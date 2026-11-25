// UC-05 Check In with QR, decision table DT-2 rules DT2-1 to DT2-3, check-in
// logic 5.8.4.8. Test plan 5.12: TC-33, TC-34; security test ST-08.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { HOUR, TEST_NOW, ist, plus, realClock, setNow } from "./helpers/clock.js";
import { createReservation, createResource, createUser, prisma, resetDb } from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

const START = ist("2026-12-07T10:00:00");

describe.skipIf(!app)("UC-05 Check In with QR (DT-2)", () => {
  const api = () => request(app!);
  const checkIn = (token: string, body: { method: "QR_SCAN" | "MANUAL_CODE"; code: string }) =>
    api().post(`${API}/check-ins`).set(bearer(token)).send(body);

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
  });
  afterEach(() => realClock());

  /** A CONFIRMED reservation 10:00-11:00 on a new room, for a new student. */
  async function confirmedAtTen() {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const reservation = await createReservation({ userId: student.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });
    return { student, room, reservation };
  }

  it("TC-33 DT2-3 09:49:59 is too early; the answer says when the window opens", async () => {
    const { student, room } = await confirmedAtTen();
    setNow(ist("2026-12-07T09:49:59"));
    const res = await checkIn(await login(app!, student.email), { method: "MANUAL_CODE", code: room.checkInCode });
    expectError(res, 422, "RULE_R7_TOO_EARLY");
    expect(new Date(res.body.error.details.windowOpensAt).getTime()).toBe(ist("2026-12-07T09:50:00").getTime());
  });

  it("TC-33 DT2-1 09:50:00 (window opens) is accepted with the QR token: CHECKED_IN, method QR_SCAN", async () => {
    const { student, room, reservation } = await confirmedAtTen();
    setNow(ist("2026-12-07T09:50:00"));
    const res = await checkIn(await login(app!, student.email), { method: "QR_SCAN", code: room.qrToken });
    expect(res.status).toBe(201);
    expect(res.body.checkIn.method).toBe("QR_SCAN");
    expect(res.body.reservation).toMatchObject({ id: reservation.id, status: "CHECKED_IN" });
  });

  it("TC-33 DT2-1 10:15:00 (window closes) is still accepted with the 6-digit code", async () => {
    const { student, room } = await confirmedAtTen();
    setNow(ist("2026-12-07T10:15:00"));
    const res = await checkIn(await login(app!, student.email), { method: "MANUAL_CODE", code: room.checkInCode });
    expect(res.status).toBe(201);
    expect(res.body.checkIn.method).toBe("MANUAL_CODE");
  });

  it("TC-33 DT2-2 10:15:01 is too late", async () => {
    const { student, room, reservation } = await confirmedAtTen();
    setNow(ist("2026-12-07T10:15:01"));
    expectError(await checkIn(await login(app!, student.email), { method: "MANUAL_CODE", code: room.checkInCode }), 422, "RULE_R7_TOO_LATE");
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("CONFIRMED");
  });

  it("TC-34 refused check-ins: unknown code, no reservation here, still pending, already checked in", async () => {
    const { student, room, reservation } = await confirmedAtTen();
    const otherRoom = await createResource("ROOM");
    const projector = await createResource("EQUIPMENT");
    const pendingOwner = await createUser("STUDENT");
    await createReservation({ userId: pendingOwner.id, resourceId: projector.id, start: START, end: plus(START, HOUR), status: "PENDING_APPROVAL" });
    setNow(START);
    const token = await login(app!, student.email);

    expectError(await checkIn(token, { method: "MANUAL_CODE", code: "999999" }), 404, "CHECKIN_CODE_INVALID");
    expectError(await checkIn(token, { method: "MANUAL_CODE", code: otherRoom.checkInCode }), 404, "NO_RESERVATION_HERE");
    expectError(
      await checkIn(await login(app!, pendingOwner.email), { method: "MANUAL_CODE", code: projector.checkInCode }),
      422,
      "RESERVATION_NOT_CONFIRMED",
    );

    expect((await checkIn(token, { method: "MANUAL_CODE", code: room.checkInCode })).status).toBe(201);
    expectError(await checkIn(token, { method: "MANUAL_CODE", code: room.checkInCode }), 409, "ALREADY_CHECKED_IN");
    expect(await prisma.checkIn.count({ where: { reservationId: reservation.id } })).toBe(1);
  });

  it("ST-08 eleven wrong codes by one user within 5 minutes: the 11th answer is 429 RATE_LIMITED", async () => {
    const student = await createUser("STUDENT");
    const token = await login(app!, student.email);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await checkIn(token, { method: "MANUAL_CODE", code: String(900000 + i) });
      statuses.push(res.status);
      if (i === 10) expectError(res, 429, "RATE_LIMITED");
    }
    expect(statuses.slice(0, 10).every((s) => s === 404)).toBe(true);
  });
});
