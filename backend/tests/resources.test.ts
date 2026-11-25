// UC-02 Search Resources and View Availability (F2). Test plan 5.12: TC-11,
// TC-13; security tests ST-05, ST-11.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { TEST_NOW, apiTime, ist, realClock, setNow } from "./helpers/clock.js";
import { createResource, createUser, resetDb } from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

describe.skipIf(!app)("UC-02 Search Resources and View Availability", () => {
  const api = () => request(app!);
  let token: string;

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
    const student = await createUser("STUDENT");
    token = await login(app!, student.email);
  });
  afterEach(() => realClock());

  it("TC-11 filter by type and minimum capacity: a capacity equal to the minimum is included", async () => {
    await createResource("ROOM", { name: "Room 39", capacity: 39 });
    await createResource("ROOM", { name: "Room 40", capacity: 40 });
    await createResource("ROOM", { name: "Room 60", capacity: 60 });
    await createResource("LAB", { name: "Lab 50", capacity: 50 });

    const min40 = await api().get(`${API}/resources`).query({ type: "ROOM", minCapacity: 40 }).set(bearer(token));
    expect(min40.status).toBe(200);
    expect(min40.body.data.map((r: { name: string }) => r.name)).toEqual(["Room 40", "Room 60"]); // sorted by name

    const min41 = await api().get(`${API}/resources`).query({ type: "ROOM", minCapacity: 41 }).set(bearer(token));
    expect(min41.body.data.map((r: { name: string }) => r.name)).toEqual(["Room 60"]);
    expect(min41.body).toMatchObject({ page: 1, pageSize: 20, total: 1 });
  });

  it("TC-13 a deactivated resource is not listed, not found and not bookable", async () => {
    const inactive = await createResource("ROOM", { name: "Study Room Closed", isActive: false });
    await createResource("ROOM", { name: "Study Room Open" });

    const search = await api().get(`${API}/resources`).query({ q: "study" }).set(bearer(token));
    expect(search.body.data.map((r: { name: string }) => r.name)).toEqual(["Study Room Open"]);

    expectError(await api().get(`${API}/resources/${inactive.id}`).set(bearer(token)), 404, "RESOURCE_NOT_FOUND");

    const reserve = await api()
      .post(`${API}/reservations`)
      .set(bearer(token))
      .send({ resourceId: inactive.id, startTime: apiTime(ist("2026-12-08T10:00:00")), endTime: apiTime(ist("2026-12-08T11:00:00")) });
    expectError(reserve, 422, "RESOURCE_INACTIVE");
  });

  it("ST-05 a student never receives the door codes", async () => {
    const room = await createResource("ROOM");
    const one = await api().get(`${API}/resources/${room.id}`).set(bearer(token));
    expect(one.status).toBe(200);
    expect(one.body).not.toHaveProperty("qrToken");
    expect(one.body).not.toHaveProperty("checkInCode");

    const list = await api().get(`${API}/resources`).set(bearer(token));
    for (const item of list.body.data) {
      expect(item).not.toHaveProperty("qrToken");
      expect(item).not.toHaveProperty("checkInCode");
    }
  });

  it("ST-11 an SQL injection string in the search is treated as text", async () => {
    await createResource("ROOM");
    const res = await api().get(`${API}/resources`).query({ q: "' OR 1=1 --" }).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
