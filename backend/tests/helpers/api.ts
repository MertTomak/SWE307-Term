// HTTP helpers for the API tests (base path /api/v1, error format 5.8.4.3).
import request from "supertest";
import type { Response } from "supertest";
import type { App } from "./target.js";
import { expect } from "vitest";
import { TEST_PASSWORD } from "./db.js";

export const API = "/api/v1";

export async function login(app: App, email: string, password = TEST_PASSWORD): Promise<string> {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password });
  expect(res.status, `login of ${email}: ${JSON.stringify(res.body)}`).toBe(200);
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Checks the status code and the error code of an error response. */
export function expectError(res: Response, status: number, code: string): void {
  expect({ status: res.status, code: res.body?.error?.code }, JSON.stringify(res.body)).toEqual({ status, code });
  expect(typeof res.body.error.message).toBe("string");
}
