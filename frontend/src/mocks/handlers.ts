// Fake answers for the endpoints the screens already use, written from the API contract
// (docs/report/5.8_api-design_Batuhan.md). Same paths, status codes, error codes and bodies as the
// real server will have, so a page does not change when the mocks are switched off.
// Endpoints without a handler here go to the real API (onUnhandledFrame: 'bypass').

import { delay, http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw'
import type { ApiErrorBody, AuthResponse, CheckInResponse, MeResponse, Role } from '../api/types'
import { API_BASE_URL } from '../config'
import { addUser, DEMO_DOOR, findUserByEmail, tokenFor, toUserDto, userFromAuthHeader } from './db'

const url = (path: string) => API_BASE_URL + path

type FieldError = { path: string; message: string }

/** Every handler answers either its success body or the common error body (5.8.4.3). */
type Answer<T> = T | ApiErrorBody

function apiError(status: number, error: ApiErrorBody['error']) {
  return HttpResponse.json<ApiErrorBody>({ error }, { status })
}

function validationError(fields: FieldError[]) {
  return apiError(400, {
    code: 'VALIDATION_ERROR',
    message: 'Some fields are not valid. Check the marked fields.',
    details: { fields },
  })
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAMPUS_ROLES: Role[] = ['STUDENT', 'ACADEMIC_STAFF']

// Login rate limit: 5 failures per e-mail in 15 minutes, the 6th try gets 429 (5.8.5, A07, ST-07).
const FAILURE_LIMIT = 5
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const failedLogins = new Map<string, number[]>()

function recentFailures(email: string, now: number): number[] {
  const recent = (failedLogins.get(email) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS)
  failedLogins.set(email, recent)
  return recent
}

/** A short wait, so the loading state of the screens can be seen and tested. */
const NETWORK_DELAY_MS = 500

export const handlers = [
  // E01 Register
  http.post<PathParams, DefaultBodyType, Answer<AuthResponse>>(url('/auth/register'), async ({ request }) => {
    await delay(NETWORK_DELAY_MS)
    const body = await readJson(request)
    const fullName = asString(body.fullName).trim()
    const email = asString(body.email).trim().toLowerCase()
    const password = asString(body.password)
    const role = asString(body.role) as Role

    const fields: FieldError[] = []
    if (fullName.length < 2 || fullName.length > 100) fields.push({ path: 'fullName', message: 'Enter 2 to 100 characters.' })
    if (!EMAIL_PATTERN.test(email)) fields.push({ path: 'email', message: 'Enter a valid e-mail address.' })
    if ([...password].length < 8) fields.push({ path: 'password', message: 'Use at least 8 characters.' })
    else if (new TextEncoder().encode(password).length > 72) fields.push({ path: 'password', message: 'The password is too long (at most 72 bytes).' })
    if (!CAMPUS_ROLES.includes(role)) fields.push({ path: 'role', message: 'Choose Student or Academic staff.' })
    if (body.privacyNoticeAccepted !== true) fields.push({ path: 'privacyNoticeAccepted', message: 'Read and accept the privacy notice.' })
    if (fields.length > 0) return validationError(fields)

    if (findUserByEmail(email)) {
      return apiError(409, { code: 'EMAIL_TAKEN', message: 'An account with this e-mail already exists. Log in instead.' })
    }

    const user = addUser({ fullName, email, password, role })
    return HttpResponse.json<AuthResponse>({ token: tokenFor(user), expiresIn: 3600, user: toUserDto(user) }, { status: 201 })
  }),

  // E02 Log in
  http.post<PathParams, DefaultBodyType, Answer<AuthResponse>>(url('/auth/login'), async ({ request }) => {
    await delay(NETWORK_DELAY_MS)
    const body = await readJson(request)
    const email = asString(body.email).trim().toLowerCase()
    const password = asString(body.password)

    const fields: FieldError[] = []
    if (!email) fields.push({ path: 'email', message: 'Required' })
    if (!password) fields.push({ path: 'password', message: 'Required' })
    if (fields.length > 0) return validationError(fields)

    const now = Date.now()
    const failures = recentFailures(email, now)
    if (failures.length >= FAILURE_LIMIT) {
      return apiError(429, { code: 'RATE_LIMITED', message: 'Too many failed attempts. Try again in 15 minutes.' })
    }

    const user = findUserByEmail(email)
    if (!user || user.password !== password) {
      failures.push(now)
      // The same answer for an unknown e-mail and a wrong password (FR-04, A07).
      return apiError(401, { code: 'INVALID_CREDENTIALS', message: 'The e-mail or the password is wrong.' })
    }

    failedLogins.delete(email)
    return HttpResponse.json<AuthResponse>({ token: tokenFor(user), expiresIn: 3600, user: toUserDto(user) })
  }),

  // E03 Current user
  http.get<PathParams, DefaultBodyType, Answer<MeResponse>>(url('/auth/me'), async ({ request }) => {
    await delay(NETWORK_DELAY_MS)
    const user = userFromAuthHeader(request.headers.get('Authorization'))
    if (!user) return apiError(401, { code: 'UNAUTHENTICATED', message: 'Please log in again.' })

    const limit = user.role === 'STUDENT' ? 2 : user.role === 'ACADEMIC_STAFF' ? 5 : null
    return HttpResponse.json<MeResponse>({
      user: toUserDto(user),
      activePenalty: null,
      activeReservationCount: 0,
      activeReservationLimit: limit,
    })
  }),

  // E11 Check in. Only step 1 of 5.8.4.8 (find the door) is real here. The mock pretends that the caller
  // has a CONFIRMED reservation on the demo door that started 2 minutes ago, so the R7 window is not tested.
  http.post<PathParams, DefaultBodyType, Answer<CheckInResponse>>(url('/check-ins'), async ({ request }) => {
    await delay(NETWORK_DELAY_MS)
    if (!userFromAuthHeader(request.headers.get('Authorization'))) {
      return apiError(401, { code: 'UNAUTHENTICATED', message: 'Please log in again.' })
    }
    const body = await readJson(request)
    const method = asString(body.method)
    const code = asString(body.code)
    if (method !== 'QR_SCAN' && method !== 'MANUAL_CODE') {
      return validationError([{ path: 'method', message: 'Use QR_SCAN or MANUAL_CODE.' }])
    }
    if (method === 'MANUAL_CODE' && !/^\d{6}$/.test(code)) {
      return validationError([{ path: 'code', message: 'Enter exactly 6 digits.' }])
    }

    const matches = method === 'QR_SCAN' ? code === DEMO_DOOR.qrToken : code === DEMO_DOOR.checkInCode
    if (!matches) {
      return apiError(404, { code: 'CHECKIN_CODE_INVALID', message: 'This code does not belong to any room, lab or equipment.' })
    }

    const now = new Date()
    const start = new Date(now.getTime() - 2 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return HttpResponse.json<CheckInResponse>(
      {
        checkIn: { id: `c-${crypto.randomUUID()}`, checkedInAt: now.toISOString(), method },
        reservation: {
          id: 'res-demo-1',
          resource: DEMO_DOOR.resource,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'CHECKED_IN',
          purpose: null,
          rejectionReason: null,
          decidedAt: null,
          cancelledAt: null,
          checkIn: { checkedInAt: now.toISOString(), method },
          createdAt: start.toISOString(),
        },
      },
      { status: 201 },
    )
  }),
]
