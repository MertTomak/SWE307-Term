// UC-04 Cancel Reservation and ownership checks (F4). Test plan 5.12: TC-25,
// TC-26, TC-30; security test ST-04.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { HOUR, SECOND, TEST_NOW, ist, plus, realClock, setNow } from "./helpers/clock.js";
import { createReservation, createResource, createUser, prisma, resetDb } from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

describe.skipIf(!app)("UC-04 Cancel Reservation", () => {
  const api = () => request(app!);
  const cancel = (token: string, id: string) => api().post(`${API}/reservations/${id}/cancel`).set(bearer(token));

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
  });
  afterEach(() => realClock());

  it("TC-25 R6 boundary: cancel 1 s before the start works; cancel exactly at the start is refused", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const start = ist("2026-12-07T10:00:00");
    const first = await createReservation({ userId: student.id, resourceId: room.id, start, end: plus(start, HOUR), status: "CONFIRMED" });
    const secondStart = ist("2026-12-07T12:00:00");
    const second = await createReservation({ userId: student.id, resourceId: room.id, start: secondStart, end: plus(secondStart, HOUR), status: "CONFIRMED" });

    setNow(plus(start, -SECOND));
    const ok = await cancel(await login(app!, student.email), first.id);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("CANCELLED");
    expect(ok.body.cancelledAt).toEqual(expect.any(String));

    setNow(secondStart);
    expectError(await cancel(await login(app!, student.email), second.id), 422, "RULE_R6_CANCEL_AFTER_START");
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("CONFIRMED");
  });

  it("TC-26 cancel a COMPLETED or REJECTED reservation: 409 INVALID_STATE_TRANSITION", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const camera = await createResource("EQUIPMENT");
    const future = ist("2026-12-09T10:00:00");
    const completed = await createReservation({ userId: student.id, resourceId: room.id, start: plus(TEST_NOW, -3 * HOUR), end: plus(TEST_NOW, -HOUR), status: "COMPLETED" });
    const rejected = await createReservation({ userId: student.id, resourceId: camera.id, start: future, end: plus(future, HOUR), status: "REJECTED", rejectionReason: "In repair" });
    const token = await login(app!, student.email);

    expectError(await cancel(token, completed.id), 409, "INVALID_STATE_TRANSITION");
    expectError(await cancel(token, rejected.id), 409, "INVALID_STATE_TRANSITION");
  });

  it("TC-30 / ST-04 another user's reservation: 404 RESERVATION_NOT_FOUND (not 403), nothing changes", async () => {
    const owner = await createUser("STUDENT");
    const intruder = await createUser("STUDENT");
    const projector = await createResource("EQUIPMENT");
    const start = ist("2026-12-08T13:00:00");
    const reservation = await createReservation({ userId: owner.id, resourceId: projector.id, start, end: plus(start, 2 * HOUR), status: "PENDING_APPROVAL" });
    const token = await login(app!, intruder.email);

    expectError(await api().get(`${API}/reservations/${reservation.id}`).set(bearer(token)), 404, "RESERVATION_NOT_FOUND");
    expectError(await cancel(token, reservation.id), 404, "RESERVATION_NOT_FOUND");
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("PENDING_APPROVAL");
  });
});
