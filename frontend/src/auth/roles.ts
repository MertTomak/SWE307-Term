import type { Role } from '../api/types'

// Access table from 5.4 (FR-05). The server checks the role again on every call (NFR-03);
// these lists only decide which pages and links the client shows.
export const CAMPUS_USER_ROLES: Role[] = ['STUDENT', 'ACADEMIC_STAFF']
export const ADMIN_ROLES: Role[] = ['RESOURCE_ADMIN']

/** First page after login. */
export function homePathFor(role: Role): string {
  return role === 'RESOURCE_ADMIN' ? '/admin/resources' : '/resources'
}
