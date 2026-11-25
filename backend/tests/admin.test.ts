// UC-06 Approve or Reject Equipment Reservation and UC-07 Manage Resources
// (F7, F8). Test plan 5.12: TC-41 (API part), TC-42, TC-43, TC-44.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { HOUR, MINUTE, TEST_NOW, ist, plus, realClock, setNow } from "./helpers/clock.js";
import { countNotifications, createReservation, createResource, createUser, prisma, resetDb } from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

const START = ist("2026-12-08T13:00:00");

describe.skipIf(!app)("UC-06 and UC-07 Resource Admin", () => {
  const api = () => request(app!);
  let adminId: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
    const admin = await createUser("RESOURCE_ADMIN");
    adminId = admin.id;
    adminToken = await login(app!, admin.email);
  });
  afterEach(() => realClock());

  async function pendingEquipment() {
    const student = await createUser("STUDENT");
    const projector = await createResource("EQUIPMENT");
    const reservation = await createReservation({ userId: student.id, resourceId: projector.id, start: START, end: plus(START, 2 * HOUR), status: "PENDING_APPROVAL" });
    return { student, reservation };
  }

  it("TC-41 (API part) approve: listed as pending, then CONFIRMED with the decider recorded and the user notified", async () => {
    const { student, reservation } = await pendingEquipment();

    const list = await api().get(`${API}/admin/reservations/pending`).set(bearer(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.map((r: { id: string }) => r.id)).toEqual([reservation.id]);
    expect(list.body.data[0].user.id).toBe(student.id);

    const res = await api().post(`${API}/admin/reservations/${reservation.id}/approve`).set(bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CONFIRMED");
    const stored = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(stored.decidedById).toBe(adminId);
    expect(stored.decidedAt).not.toBeNull();
    expect(await countNotifications(student.id, "RESERVATION_APPROVED")).toBe(1);
  });

  it("TC-42 reject: an empty reason is refused; with a reason it is REJECTED and the reason is stored", async () => {
    const { student, reservation } = await pendingEquipment();
    const reject = (reason: string) =>
      api().post(`${API}/admin/reservations/${reservation.id}/reject`).set(bearer(adminToken)).send({ reason });

    expectError(await reject(""), 400, "VALIDATION_ERROR");

    const res = await reject("Device in repair");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "REJECTED", rejectionReason: "Device in repair" });
    expect(await countNotifications(student.id, "RESERVATION_REJECTED")).toBe(1);
  });

  it("TC-43 decisions on a reservation that changed: after the start 422, on a CONFIRMED one 409", async () => {
    const { reservation } = await pendingEquipment();
    const student = await createUser("STUDENT");
    const laptop = await createResource("EQUIPMENT");
    const confirmed = await createReservation({ userId: student.id, resourceId: laptop.id, start: START, end: plus(START, HOUR), status: "CONFIRMED" });

    expectError(
      await api().post(`${API}/admin/reservations/${confirmed.id}/approve`).set(bearer(adminToken)),
      409,
      "INVALID_STATE_TRANSITION",
    );

    setNow(plus(START, MINUTE));
    const lateToken = await login(app!, (await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).email);
    expectError(
      await api().post(`${API}/admin/reservations/${reservation.id}/approve`).set(bearer(lateToken)),
      422,
      "RESERVATION_ALREADY_STARTED",
    );
  });

  it("TC-44 create a resource: unique 6-digit code generated, codes hidden from students, ROOM needs a capacity", async () => {
    const existing = await createResource("ROOM");
    const created = await api()
      .post(`${API}/admin/resources`)
      .set(bearer(adminToken))
      .send({ name: "Room T-01", type: "ROOM", location: "Test Building", capacity: 10 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Room T-01", isActive: true });
    expect(created.body.checkInCode).toMatch(/^\d{6}$/);
    expect(created.body.checkInCode).not.toBe(existing.checkInCode);
    expect(created.body.qrToken).toEqual(expect.any(String));

    const student = await createUser("STUDENT");
    const seenByStudent = await api().get(`${API}/resources/${created.body.id}`).set(bearer(await login(app!, student.email)));
    expect(seenByStudent.body).not.toHaveProperty("checkInCode");
    expect(seenByStudent.body).not.toHaveProperty("qrToken");

    const noCapacity = await api()
      .post(`${API}/admin/resources`)
      .set(bearer(adminToken))
      .send({ name: "Room T-02", type: "ROOM", location: "Test Building", capacity: null });
    expectError(noCapacity, 400, "VALIDATION_ERROR");
  });
});
