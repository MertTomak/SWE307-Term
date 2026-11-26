// In-browser fake data for the mock API (MSW). Used only when VITE_USE_MOCKS=true in development.
// Kept in sessionStorage so that a page reload keeps the registered users, like a real server would.
// All users here are fictional (5.8.5.5: no real personal data).

import type { Role, UserDto } from '../api/types'

export interface MockUser extends UserDto {
  /** Plain text only because this is a fake in the browser. The real server stores a bcrypt hash. */
  password: string
}

/** Test password of the three built-in mock users. Not the seed password of the real database. */
export const MOCK_PASSWORD = 'mock-pass-123'

const DEFAULT_USERS: MockUser[] = [
  { id: 'u-student', email: 'student@campusslot.test', fullName: 'Deniz Student', role: 'STUDENT', password: MOCK_PASSWORD },
  { id: 'u-staff', email: 'staff@campusslot.test', fullName: 'Ece Staff', role: 'ACADEMIC_STAFF', password: MOCK_PASSWORD },
  { id: 'u-admin', email: 'admin@campusslot.test', fullName: 'Can Admin', role: 'RESOURCE_ADMIN', password: MOCK_PASSWORD },
]

const STORAGE_KEY = 'campusslot.mock.users'

function load(): MockUser[] {
  try {
    const text = sessionStorage.getItem(STORAGE_KEY)
    if (text) return JSON.parse(text) as MockUser[]
  } catch {
    // Storage blocked or broken: start again from the built-in users.
  }
  return [...DEFAULT_USERS]
}

function save(users: MockUser[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  } catch {
    // Storage blocked: the users live only until the page is reloaded.
  }
}

let users = load()

export function findUserByEmail(email: string): MockUser | undefined {
  return users.find((u) => u.email === email)
}

export function findUserById(id: string): MockUser | undefined {
  return users.find((u) => u.id === id)
}

export function addUser(input: { fullName: string; email: string; password: string; role: Role }): MockUser {
  const user: MockUser = { id: `u-${crypto.randomUUID()}`, ...input }
  users = [...users, user]
  save(users)
  return user
}

/** Never send the password back, same as UserDto on the real server. */
export function toUserDto(user: MockUser): UserDto {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
}

// A fake token is just "mock-token.<userId>". The real server signs a JWT (5.8.4.2).
const TOKEN_PREFIX = 'mock-token.'

export function tokenFor(user: MockUser): string {
  return TOKEN_PREFIX + user.id
}

export function userFromAuthHeader(header: string | null): MockUser | undefined {
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token?.startsWith(TOKEN_PREFIX)) return undefined
  return findUserById(token.slice(TOKEN_PREFIX.length))
}

// One fictional door for testing the Check-in page (H23). The real server generates these per resource (E18).
export interface MockDoor {
  resource: { id: string; name: string; type: 'ROOM'; location: string }
  /** Text inside the QR code on the door (method QR_SCAN). */
  qrToken: string
  /** 6 digits printed under the QR code (method MANUAL_CODE). */
  checkInCode: string
}

export const DEMO_DOOR: MockDoor = {
  resource: { id: 'r-demo-a101', name: 'Study Room A-101', type: 'ROOM', location: 'Block B, floor 1' },
  qrToken: 'campusslot-demo-qr-a101',
  checkInCode: '482913',
}
