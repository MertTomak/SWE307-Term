// UC-09 Process No-Shows and Apply Penalties, decision table DT-2 rules DT2-4
// to DT2-7, scheduler jobs J1-J3 (5.8.4.9). Test plan 5.12: TC-35 to TC-40.
// The jobs are called directly through runSchedulerOnce(now) (hand-off H33).
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { DAY, HOUR, MINUTE, SECOND, TEST_NOW, apiTime, ist, plus, realClock, setNow } from "./helpers/clock.js";
import {
  countNotifications,
  createPenalty,
  createReservation,
  createResource,
  createUser,
  prisma,
  resetDb,
} from "./helpers/db.js";
import { loadApp, loadScheduler } from "./helpers/target.js";

const runSchedulerOnce = await loadScheduler();
const app = await loadApp();

const START = ist("2026-12-07T10:00:00");

/** Sets the test clock and runs one scheduler run at that moment. */
async function runAt(now: Date) {
  setNow(now);
  await runSchedulerOnce!(now);
}

const statusOf = async (id: string) => (await prisma.reservation.findUniqueOrThrow({ where: { id } })).status;

describe.skipIf(!runSchedulerOnce)("UC-09 System Scheduler (DT-2)", () => {
  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
  });
  afterEach(() => realClock());

  /** A user, a room and n NO_SHOW reservations that started the given numbers of days before `before`. */
  async function userWithNoShows(daysAgo: number[], before: Date) {
    const user = await createUser("STUDENT");
    const room = await createResource("ROOM");
    for (const d of daysAgo) {
      const start = plus(before, -d * DAY);
      await createReservation({ userId: user.id, resourceId: room.id, start, end: plus(start, HOUR), status: "NO_SHOW" });
    }
    return { user, room };
  }

  it("TC-35 DT2-4 / DT2-5 no check-in: still CONFIRMED at start + 15:00, NO_SHOW at start + 15:01", async () => {
    const user = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const r = await createReservation({ userId: user.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });

    await runAt(plus(START, 15 * MINUTE));
    expect(await statusOf(r.id)).toBe("CONFIRMED");

    await runAt(plus(START, 15 * MINUTE + SECOND));
    expect(await statusOf(r.id)).toBe("NO_SHOW");
    expect(await countNotifications(user.id, "NO_SHOW_RECORDED")).toBe(1);
    expect(await prisma.penalty.count({ where: { userId: user.id } })).toBe(0); // first no-show: no penalty
  });

  it.skipIf(!app)("TC-35 (API part) after a NO_SHOW the calendar shows the slot as free and it can be booked", async () => {
    if (!app) return; // narrows the type; the test is skipped without src/app.ts
    const owner = await createUser("STUDENT");
    const other = await createUser("STUDENT");
    const room = await createResource("ROOM");
    await createReservation({ userId: owner.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });
    const token = await login(app, other.email);
    const calendar = () =>
      request(app!).get(`${API}/resources/${room.id}/availability`).query({ date: "2026-12-07" }).set(bearer(token));

    // Before the no-show the 10:00-11:00 slot is booked (FR-12) ...
    const before = await calendar();
    expect(before.status).toBe(200);
    expect(before.body.bookedSlots.map((s: { status: string }) => s.status)).toEqual(["CONFIRMED"]);

    // ... after the scheduler marks it NO_SHOW, the calendar shows it as free (FR-40, plan step 3).
    await runAt(plus(START, 16 * MINUTE));
    const after = await calendar();
    expect(after.status).toBe(200);
    expect(after.body.bookedSlots).toEqual([]);

    // The free time can really be booked (R3 ignores NO_SHOW).
    const res = await request(app)
      .post(`${API}/reservations`)
      .set(bearer(await login(app, other.email)))
      .send({ resourceId: room.id, startTime: apiTime(plus(START, 20 * MINUTE)), endTime: apiTime(plus(START, HOUR)) });
    expect(res.status).toBe(201);
  });

  it("TC-36 DT2-7 third no-show within 30 days: NO_SHOW and a 7-day penalty", async () => {
    const runTime = plus(START, 16 * MINUTE);
    const { user, room } = await userWithNoShows([29, 10], runTime);
    const r = await createReservation({ userId: user.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });

    await runAt(runTime);
    expect(await statusOf(r.id)).toBe("NO_SHOW");
    const penalties = await prisma.penalty.findMany({ where: { userId: user.id } });
    expect(penalties).toHaveLength(1);
    expect(penalties[0]!.noShowCount).toBe(3);
    expect(penalties[0]!.endsAt.getTime() - penalties[0]!.startsAt.getTime()).toBe(7 * DAY);
    expect(Math.abs(penalties[0]!.startsAt.getTime() - runTime.getTime())).toBeLessThanOrEqual(MINUTE);
    expect(await countNotifications(user.id, "PENALTY_APPLIED")).toBe(1);

    if (app) {
      const later = ist("2026-12-09T10:00:00");
      const res = await request(app)
        .post(`${API}/reservations`)
        .set(bearer(await login(app, user.email)))
        .send({ resourceId: room.id, startTime: apiTime(later), endTime: apiTime(plus(later, HOUR)) });
      expectError(res, 422, "RULE_R4_ACTIVE_PENALTY");
    }
  });

  it("TC-37 DT2-5 a no-show 31 days ago is outside the window: no penalty", async () => {
    const runTime = plus(START, 16 * MINUTE);
    const { user, room } = await userWithNoShows([31, 10], runTime);
    await createReservation({ userId: user.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });

    await runAt(runTime);
    expect(await prisma.penalty.count({ where: { userId: user.id } })).toBe(0);
  });

  it("TC-37 DT2-6 a user who is already banned does not get a second penalty", async () => {
    const runTime = plus(START, 16 * MINUTE);
    const { user, room } = await userWithNoShows([12, 8, 4], runTime);
    await createPenalty(user.id, plus(runTime, -4 * DAY));
    const r = await createReservation({ userId: user.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });

    await runAt(runTime);
    expect(await statusOf(r.id)).toBe("NO_SHOW");
    expect(await prisma.penalty.count({ where: { userId: user.id } })).toBe(1);
  });

  it("TC-38 J2 a CHECKED_IN reservation becomes COMPLETED at its end time, not before", async () => {
    const user = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const end = ist("2026-12-07T12:00:00");
    const r = await createReservation({ userId: user.id, resourceId: room.id, start: START, end, status: "CHECKED_IN" });

    await runAt(plus(end, -SECOND));
    expect(await statusOf(r.id)).toBe("CHECKED_IN");
    await runAt(end);
    expect(await statusOf(r.id)).toBe("COMPLETED");
  });

  it("TC-39 J3 an undecided equipment reservation is rejected at its start time", async () => {
    const user = await createUser("STUDENT");
    const projector = await createResource("EQUIPMENT");
    const start = ist("2026-12-07T14:00:00");
    const r = await createReservation({ userId: user.id, resourceId: projector.id, start, end: plus(start, HOUR), status: "PENDING_APPROVAL" });

    await runAt(plus(start, -SECOND));
    expect(await statusOf(r.id)).toBe("PENDING_APPROVAL");

    await runAt(start);
    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: r.id } });
    expect(after.status).toBe("REJECTED");
    expect(after.rejectionReason).toBe("Not approved before the start time");
    expect(after.decidedById).toBeNull();
    expect(await countNotifications(user.id, "RESERVATION_REJECTED")).toBe(1);
  });

  it("TC-40 / NFR-14 catch-up after a stop, and a second run changes nothing", async () => {
    const user = await createUser("STUDENT");
    const room = await createResource("ROOM");
    const a = await createReservation({ userId: user.id, resourceId: room.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });
    const bStart = plus(START, 2 * HOUR);
    const b = await createReservation({ userId: user.id, resourceId: room.id, start: bStart, end: plus(bStart, HOUR), status: "CONFIRMED" });

    // The scheduler was stopped; it runs again long after both no-show times.
    const restart = plus(START, 5 * HOUR);
    await runAt(restart);
    expect([await statusOf(a.id), await statusOf(b.id)]).toEqual(["NO_SHOW", "NO_SHOW"]);
    expect(await countNotifications(user.id, "NO_SHOW_RECORDED")).toBe(2);

    await runAt(plus(restart, MINUTE));
    expect(await countNotifications(user.id, "NO_SHOW_RECORDED")).toBe(2);
  });
});
