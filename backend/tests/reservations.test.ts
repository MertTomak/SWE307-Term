// UC-03 Make Reservation, decision table DT-1 (5.6.5), rule chain 5.8.4.7.
// Test plan 5.12: TC-14/TC-15 (API part), TC-16 to TC-23.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { DAY, MINUTE, TEST_NOW, apiTime, ist, plus, realClock, setNow } from "./helpers/clock.js";
import {
  countNotifications,
  createPenalty,
  createReservation,
  createResource,
  createUser,
  prisma,
  resetDb,
} from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

// Test calendar: "now" is Mon 7 Dec 2026 08:00; reservations are on later days.
const slot = (day: string, from: string, to: string) => ({
  startTime: apiTime(ist(`${day}T${from}`)),
  endTime: apiTime(ist(`${day}T${to}`)),
});

describe.skipIf(!app)("UC-03 Make Reservation (DT-1)", () => {
  const api = () => request(app!);
  const reserve = (token: string, resourceId: string, times: { startTime: string; endTime: string }) =>
    api().post(`${API}/reservations`).set(bearer(token)).send({ resourceId, ...times });

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
  });
  afterEach(() => realClock());

  it("DT1-6 / TC-14 (API part) valid ROOM request: 201 CONFIRMED and a notification", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const res = await reserve(await login(app!, student.email), room.id, slot("2026-12-09", "10:00:00", "12:00:00"));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "CONFIRMED", resource: { id: room.id } });
    expect(await countNotifications(student.id, "RESERVATION_CONFIRMED")).toBe(1);
  });

  it("DT1-6 valid LAB request: 201 CONFIRMED", async () => {
    const student = await createUser("STUDENT");
    const lab = await createResource("LAB");
    const res = await reserve(await login(app!, student.email), lab.id, slot("2026-12-09", "10:00:00", "11:00:00"));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("CONFIRMED");
  });

  it("DT1-5 / TC-15 (API part) valid EQUIPMENT request: 201 PENDING_APPROVAL and a notification", async () => {
    const student = await createUser("STUDENT");
    const projector = await createResource("EQUIPMENT");
    const res = await reserve(await login(app!, student.email), projector.id, slot("2026-12-09", "13:00:00", "14:00:00"));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING_APPROVAL");
    expect(await countNotifications(student.id, "RESERVATION_PENDING")).toBe(1);
  });

  it("DT1-1 / TC-16 R1 boundary: exactly 3 h is accepted, 3 h 01 min is rejected", async () => {
    const student = await createUser("STUDENT");
    const token = await login(app!, student.email);
    const roomA = await createResource("ROOM");
    const roomB = await createResource("ROOM");

    const threeHours = await reserve(token, roomA.id, slot("2026-12-09", "09:00:00", "12:00:00"));
    expect(threeHours.status).toBe(201);

    const tooLong = await reserve(token, roomB.id, slot("2026-12-09", "09:00:00", "12:01:00"));
    expectError(tooLong, 422, "RULE_R1_MAX_DURATION");
    expect(tooLong.body.error.rule).toBe("R1");
  });

  it("DT1-2 / TC-17 R4: running penalty rejects; one minute after it ends the request is accepted", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const penalty = await createPenalty(student.id, plus(TEST_NOW, -1 * DAY)); // ends TEST_NOW + 6 days
    const token = await login(app!, student.email);
    const times = slot("2026-12-20", "10:00:00", "11:00:00"); // after the penalty

    const blocked = await reserve(token, room.id, times);
    expectError(blocked, 422, "RULE_R4_ACTIVE_PENALTY");
    expect(blocked.body.error.rule).toBe("R4");
    expect(new Date(blocked.body.error.details.penaltyEndsAt).getTime()).toBe(penalty.endsAt.getTime());

    setNow(plus(penalty.endsAt, MINUTE));
    const freshToken = await login(app!, student.email);
    expect((await reserve(freshToken, room.id, times)).status).toBe(201);
  });

  it("DT1-3 / TC-18 R2 student limit 2: the 3rd active reservation is rejected", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const token = await login(app!, student.email);

    expect((await reserve(token, room.id, slot("2026-12-09", "10:00:00", "11:00:00"))).status).toBe(201);
    expect((await reserve(token, room.id, slot("2026-12-10", "10:00:00", "11:00:00"))).status).toBe(201);
    const third = await reserve(token, room.id, slot("2026-12-11", "10:00:00", "11:00:00"));
    expectError(third, 422, "RULE_R2_ACTIVE_LIMIT");
    expect(third.body.error.details).toMatchObject({ limit: 2, active: 2 });
  });

  it("DT1-3 / TC-18 R2 academic staff limit 5: the 6th active reservation is rejected", async () => {
    const staff = await createUser("ACADEMIC_STAFF");
    const room = await createResource("ROOM");
    const token = await login(app!, staff.email);

    for (let day = 9; day <= 13; day++) {
      const date = `2026-12-${String(day).padStart(2, "0")}`;
      expect((await reserve(token, room.id, slot(date, "10:00:00", "11:00:00"))).status).toBe(201);
    }
    const sixth = await reserve(token, room.id, slot("2026-12-14", "10:00:00", "11:00:00"));
    expectError(sixth, 422, "RULE_R2_ACTIVE_LIMIT");
    expect(sixth.body.error.details).toMatchObject({ limit: 5, active: 5 });
  });

  it("TC-19 D1: only future PENDING_APPROVAL and CONFIRMED reservations count as active", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const other = await createResource("ROOM");
    const past = (h: number) => ({ start: plus(TEST_NOW, -h * DAY), end: plus(TEST_NOW, -h * DAY + 60 * MINUTE) });
    // Not active: finished, cancelled, rejected, no-show, and one that has started (CHECKED_IN).
    await createReservation({ userId: student.id, resourceId: other.id, ...past(5), status: "COMPLETED" });
    await createReservation({ userId: student.id, resourceId: other.id, ...past(4), status: "NO_SHOW" });
    await createReservation({ userId: student.id, resourceId: other.id, start: plus(TEST_NOW, 2 * DAY), end: plus(TEST_NOW, 2 * DAY + 60 * MINUTE), status: "CANCELLED" });
    await createReservation({ userId: student.id, resourceId: other.id, start: plus(TEST_NOW, 3 * DAY), end: plus(TEST_NOW, 3 * DAY + 60 * MINUTE), status: "REJECTED" });
    await createReservation({ userId: student.id, resourceId: other.id, start: plus(TEST_NOW, -10 * MINUTE), end: plus(TEST_NOW, 50 * MINUTE), status: "CHECKED_IN" });
    // Active: one future CONFIRMED.
    await createReservation({ userId: student.id, resourceId: other.id, start: plus(TEST_NOW, 4 * DAY), end: plus(TEST_NOW, 4 * DAY + 60 * MINUTE), status: "CONFIRMED" });
    const token = await login(app!, student.email);

    const me = await api().get(`${API}/auth/me`).set(bearer(token));
    expect(me.body).toMatchObject({ activeReservationCount: 1, activeReservationLimit: 2 });

    const second = await reserve(token, room.id, slot("2026-12-15", "10:00:00", "11:00:00"));
    expect(second.status).toBe(201);
    expectError(await reserve(token, room.id, slot("2026-12-16", "10:00:00", "11:00:00")), 422, "RULE_R2_ACTIVE_LIMIT");

    // Cancelling one frees a place under the limit (FR-27).
    await api().post(`${API}/reservations/${second.body.id}/cancel`).set(bearer(token)).expect(200);
    expect((await reserve(token, room.id, slot("2026-12-16", "10:00:00", "11:00:00"))).status).toBe(201);
  });

  it("DT1-4 / TC-20 R3: overlap rejected, back-to-back accepted, PENDING blocks, CANCELLED does not", async () => {
    const owner = await createUser("STUDENT");
    const student = await createUser("STUDENT");
    const staff = await createUser("ACADEMIC_STAFF");
    const lab = await createResource("LAB");
    const projector = await createResource("EQUIPMENT");
    await createReservation({ userId: owner.id, resourceId: lab.id, start: ist("2026-12-08T10:00:00"), end: ist("2026-12-08T12:00:00"), status: "CONFIRMED" });
    await createReservation({ userId: owner.id, resourceId: projector.id, start: ist("2026-12-08T13:00:00"), end: ist("2026-12-08T15:00:00"), status: "PENDING_APPROVAL" });
    await createReservation({ userId: owner.id, resourceId: lab.id, start: ist("2026-12-08T15:00:00"), end: ist("2026-12-08T16:00:00"), status: "CANCELLED" });
    const token = await login(app!, student.email);
    const staffToken = await login(app!, staff.email);

    const overlap = await reserve(token, lab.id, slot("2026-12-08", "11:00:00", "13:00:00"));
    expectError(overlap, 409, "RULE_R3_OVERLAP");
    expect(overlap.body.error.rule).toBe("R3");

    expect((await reserve(token, lab.id, slot("2026-12-08", "12:00:00", "13:00:00"))).status).toBe(201);
    expectError(await reserve(staffToken, projector.id, slot("2026-12-08", "14:00:00", "15:00:00")), 409, "RULE_R3_OVERLAP");
    expect((await reserve(staffToken, lab.id, slot("2026-12-08", "15:00:00", "16:00:00"))).status).toBe(201);
  });

  it("TC-21 / NFR-08 two users book the same slot at the same moment: exactly one succeeds", async () => {
    const a = await createUser("STUDENT");
    const b = await createUser("ACADEMIC_STAFF");
    const room = await createResource("ROOM");
    const [tokenA, tokenB] = [await login(app!, a.email), await login(app!, b.email)];
    const times = slot("2026-12-12", "10:00:00", "11:00:00");

    const results = await Promise.all([reserve(tokenA, room.id, times), reserve(tokenB, room.id, times)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expectError(results.find((r) => r.status === 409)!, 409, "RULE_R3_OVERLAP");
    expect(await prisma.reservation.count({ where: { resourceId: room.id } })).toBe(1);
  });

  it("TC-22 rule order R1 -> R4 -> R2 -> R3: the first failing rule is reported", async () => {
    const student = await createUser("STUDENT");
    const other = await createUser("STUDENT");
    const lab = await createResource("LAB");
    const room = await createResource("ROOM");
    await createPenalty(student.id, plus(TEST_NOW, -1 * DAY));
    await createReservation({ userId: other.id, resourceId: lab.id, start: ist("2026-12-08T10:00:00"), end: ist("2026-12-08T12:00:00"), status: "CONFIRMED" });
    const token = await login(app!, student.email);

    // Penalty (R4) and overlap (R3): R4 is checked first (DT-1 rule 9).
    expectError(await reserve(token, lab.id, slot("2026-12-08", "11:00:00", "12:00:00")), 422, "RULE_R4_ACTIVE_PENALTY");
    // Penalty (R4) and 4 hours (R1): R1 is checked first (DT-1 rules 5-8).
    expectError(await reserve(token, room.id, slot("2026-12-11", "09:00:00", "13:00:00")), 422, "RULE_R1_MAX_DURATION");
  });

  it("TC-23 invalid times: start in the past, end not after start, time without offset", async () => {
    const student = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const token = await login(app!, student.email);

    const past = await reserve(token, room.id, { startTime: apiTime(plus(TEST_NOW, -MINUTE)), endTime: apiTime(plus(TEST_NOW, 59 * MINUTE)) });
    expectError(past, 422, "START_IN_PAST");

    const sameTime = await reserve(token, room.id, slot("2026-12-09", "10:00:00", "10:00:00"));
    expectError(sameTime, 422, "INVALID_TIME_RANGE");

    const noOffset = await reserve(token, room.id, { startTime: "2026-12-09T10:00:00", endTime: "2026-12-09T11:00:00" });
    expectError(noOffset, 400, "VALIDATION_ERROR");
  });
});
