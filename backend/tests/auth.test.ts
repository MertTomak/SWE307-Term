// UC-01 Register and Log In, role checks (F1). Test plan 5.12: TC-02, TC-03,
// TC-04, TC-06, TC-07, TC-09; security tests ST-01, ST-02, ST-03, ST-06, ST-07, ST-09, ST-10.
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { API, bearer, expectError, login } from "./helpers/api.js";
import { HOUR, SECOND, TEST_NOW, apiTime, ist, plus, realClock, setNow } from "./helpers/clock.js";
import { createResource, createUser, prisma, resetDb } from "./helpers/db.js";
import { loadApp } from "./helpers/target.js";

const app = await loadApp();

const registerBody = (email: string, overrides: Record<string, unknown> = {}) => ({
  fullName: "Test Student",
  email,
  password: "Valid-Pass-8",
  role: "STUDENT",
  privacyNoticeAccepted: true,
  ...overrides,
});

describe.skipIf(!app)("UC-01 Register and Log In, authorisation", () => {
  const api = () => request(app!);

  beforeEach(async () => {
    await resetDb();
    setNow(TEST_NOW);
  });
  afterEach(() => realClock());

  it("TC-01 (API part) register a student: 201, token, role STUDENT, user is logged in", async () => {
    const res = await api().post(`${API}/auth/register`).send(registerBody("tc01@campusslot.test"));
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBe(3600);
    expect(res.body.user).toMatchObject({ email: "tc01@campusslot.test", role: "STUDENT" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("TC-02 register with an e-mail that is already used: 409 EMAIL_TAKEN, no second user", async () => {
    const existing = await createUser("STUDENT");
    const res = await api().post(`${API}/auth/register`).send(registerBody(existing.email));
    expectError(res, 409, "EMAIL_TAKEN");
    expect(await prisma.user.count({ where: { email: existing.email } })).toBe(1);
  });

  it("TC-03 register without accepting the privacy notice: 400 VALIDATION_ERROR, no user", async () => {
    const res = await api()
      .post(`${API}/auth/register`)
      .send(registerBody("tc03@campusslot.test", { privacyNoticeAccepted: false }));
    expectError(res, 400, "VALIDATION_ERROR");
    expect(await prisma.user.count()).toBe(0);
  });

  it.each([
    ["7 characters", "a".repeat(7), 400],
    ["8 characters", "a".repeat(8), 201],
    ["72 bytes", "a".repeat(72), 201],
    ["73 bytes", "a".repeat(73), 400],
    ["37 characters but 73 bytes (UTF-8)", "a" + "ğ".repeat(36), 400],
  ])("TC-04 password boundary: %s -> %i", async (_label, password, expected) => {
    const res = await api()
      .post(`${API}/auth/register`)
      .send(registerBody(`tc04.${password.length}.${expected}@campusslot.test`, { password }));
    if (expected === 400) expectError(res, 400, "VALIDATION_ERROR");
    else expect(res.status).toBe(201);
  });

  it("ST-06 register with role RESOURCE_ADMIN: 400 VALIDATION_ERROR", async () => {
    const res = await api()
      .post(`${API}/auth/register`)
      .send(registerBody("st06@campusslot.test", { role: "RESOURCE_ADMIN" }));
    expectError(res, 400, "VALIDATION_ERROR");
    expect(await prisma.user.count()).toBe(0);
  });

  it("ST-10 only a bcrypt hash of the password is stored", async () => {
    await api().post(`${API}/auth/register`).send(registerBody("st10@campusslot.test")).expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "st10@campusslot.test" } });
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    expect(user.passwordHash).not.toContain("Valid-Pass-8");
  });

  it("TC-06 / ST-09 wrong password and unknown e-mail: both 401 INVALID_CREDENTIALS with the same message", async () => {
    const student = await createUser("STUDENT");
    const wrongPassword = await api().post(`${API}/auth/login`).send({ email: student.email, password: "Wrong-Pass-1" });
    const unknownEmail = await api().post(`${API}/auth/login`).send({ email: "nobody@campusslot.test", password: "Wrong-Pass-1" });
    expectError(wrongPassword, 401, "INVALID_CREDENTIALS");
    expectError(unknownEmail, 401, "INVALID_CREDENTIALS");
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("ST-07 six wrong logins for one e-mail within 15 minutes: the 6th answer is 429 RATE_LIMITED", async () => {
    const student = await createUser("STUDENT");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await api().post(`${API}/auth/login`).send({ email: student.email, password: `Wrong-Pass-${i}` });
      statuses.push(res.status);
      if (i === 5) expectError(res, 429, "RATE_LIMITED");
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
  });

  it("TC-07 / ST-03 role checks on the server: 403 FORBIDDEN", async () => {
    const student = await createUser("STUDENT");
    const admin = await createUser("RESOURCE_ADMIN");
    const room = await createResource("ROOM");
    const studentToken = await login(app!, student.email);
    const adminToken = await login(app!, admin.email);

    const pendingList = await api().get(`${API}/admin/reservations/pending`).set(bearer(studentToken));
    expectError(pendingList, 403, "FORBIDDEN");

    const adminReserves = await api()
      .post(`${API}/reservations`)
      .set(bearer(adminToken))
      .send({ resourceId: room.id, startTime: apiTime(ist("2026-12-08T10:00:00")), endTime: apiTime(ist("2026-12-08T11:00:00")) });
    expectError(adminReserves, 403, "FORBIDDEN");

    const adminChecksIn = await api()
      .post(`${API}/check-ins`)
      .set(bearer(adminToken))
      .send({ method: "MANUAL_CODE", code: room.checkInCode });
    expectError(adminChecksIn, 403, "FORBIDDEN");
  });

  it("TC-09 / ST-01 / ST-02 missing, tampered and expired token: 401", async () => {
    const student = await createUser("STUDENT");
    const token = await login(app!, student.email);

    expectError(await api().get(`${API}/reservations/me`), 401, "UNAUTHENTICATED");

    // Change the first character of the signature (all 6 bits of it are significant;
    // the last character of a base64url signature can carry padding bits only).
    const sigStart = token.lastIndexOf(".") + 1;
    const flipped = token[sigStart] === "A" ? "B" : "A";
    const tampered = token.slice(0, sigStart) + flipped + token.slice(sigStart + 1);
    expectError(await api().get(`${API}/reservations/me`).set(bearer(tampered)), 401, "UNAUTHENTICATED");

    // Still valid 1 s before the end of its 1-hour lifetime (NFR-02) ...
    setNow(plus(TEST_NOW, HOUR - SECOND));
    expect((await api().get(`${API}/reservations/me`).set(bearer(token))).status).toBe(200);
    // ... and expired 1 s after it.
    setNow(plus(TEST_NOW, HOUR + SECOND));
    expectError(await api().get(`${API}/reservations/me`).set(bearer(token)), 401, "TOKEN_EXPIRED");
  });
});
