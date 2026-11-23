// Types of the CampusSlot REST API.
// Source of truth: docs/report/5.8_api-design_Batuhan.md (5.8.4.5 DTOs).
// Enum values are exactly the ones in the project card and backend/prisma/schema.prisma.

export type Role = 'STUDENT' | 'ACADEMIC_STAFF' | 'RESOURCE_ADMIN'
export type CampusUserRole = Exclude<Role, 'RESOURCE_ADMIN'>

export type ResourceType = 'ROOM' | 'LAB' | 'EQUIPMENT'

export type ReservationStatus =
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REJECTED'

export type CheckInMethod = 'QR_SCAN' | 'MANUAL_CODE'

export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_PENDING'
  | 'RESERVATION_APPROVED'
  | 'RESERVATION_REJECTED'
  | 'RESERVATION_CANCELLED'
  | 'CHECK_IN_REMINDER'
  | 'NO_SHOW_RECORDED'
  | 'PENALTY_APPLIED'

/** ISO 8601 timestamp with an offset, e.g. "2026-11-25T14:00:00+03:00". */
export type IsoDateTime = string
/** Calendar day in Europe/Istanbul, "YYYY-MM-DD". */
export type IsoDate = string

export interface Page<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

// ── DTOs ──────────────────────────────────────────────

export interface UserDto {
  id: string
  email: string
  fullName: string
  role: Role
}

export interface ResourceDto {
  id: string
  name: string
  type: ResourceType
  location: string
  capacity: number | null
  description: string | null
  isActive: boolean
}

/** Only for RESOURCE_ADMIN. Contains the door codes. */
export interface AdminResourceDto extends ResourceDto {
  qrToken: string
  checkInCode: string
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface ReservationDto {
  id: string
  resource: Pick<ResourceDto, 'id' | 'name' | 'type' | 'location'>
  startTime: IsoDateTime
  endTime: IsoDateTime
  status: ReservationStatus
  purpose: string | null
  rejectionReason: string | null
  decidedAt: IsoDateTime | null
  cancelledAt: IsoDateTime | null
  checkIn: { checkedInAt: IsoDateTime; method: CheckInMethod } | null
  createdAt: IsoDateTime
}

export interface AdminReservationDto extends ReservationDto {
  user: Pick<UserDto, 'id' | 'fullName' | 'email'>
}

export interface NotificationDto {
  id: string
  type: NotificationType
  message: string
  reservationId: string | null
  isRead: boolean
  createdAt: IsoDateTime
}

export interface PenaltyDto {
  id: string
  user: Pick<UserDto, 'id' | 'fullName' | 'email'>
  reason: string
  noShowCount: number
  startsAt: IsoDateTime
  endsAt: IsoDateTime
}

// ── Request bodies and responses ──────────────────────

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  role: CampusUserRole
  privacyNoticeAccepted: true
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  expiresIn: number
  user: UserDto
}

export interface MeResponse {
  user: UserDto
  activePenalty: { reason: string; endsAt: IsoDateTime } | null
  activeReservationCount: number
  /** null for RESOURCE_ADMIN */
  activeReservationLimit: number | null
}

export interface ResourceSearchQuery extends PageQuery {
  q?: string
  type?: ResourceType
  minCapacity?: number
}

export interface AvailabilityResponse {
  resourceId: string
  date: IsoDate
  timeZone: string
  bookedSlots: { startTime: IsoDateTime; endTime: IsoDateTime; status: ReservationStatus }[]
}

export interface CreateReservationRequest {
  resourceId: string
  startTime: IsoDateTime
  endTime: IsoDateTime
  purpose?: string
}

export interface CheckInRequest {
  method: CheckInMethod
  code: string
}

export interface CheckInResponse {
  checkIn: { id: string; checkedInAt: IsoDateTime; method: CheckInMethod }
  reservation: ReservationDto
}

export interface NotificationPage extends Page<NotificationDto> {
  unreadCount: number
}

export interface CreateResourceRequest {
  name: string
  type: ResourceType
  location: string
  capacity: number | null
  description?: string
}

export type UpdateResourceRequest = Partial<
  Pick<AdminResourceDto, 'name' | 'location' | 'capacity' | 'description' | 'isActive'>
>

export interface UsageReportRow {
  resource: Pick<ResourceDto, 'id' | 'name' | 'type'>
  reservationCount: number
  bookedHours: number
  noShowCount: number
  occupancyRate: number
  noShowRate: number | null
}

export interface UsageReportResponse {
  from: IsoDate
  to: IsoDate
  timeZone: string
  rows: UsageReportRow[]
}

export interface NoShowReportRow {
  user: Pick<UserDto, 'id' | 'fullName' | 'email'>
  noShowCount: number
  lastNoShowAt: IsoDateTime
}

// ── Errors (5.8.4.3) ──────────────────────────────────

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    rule?: string
    details?: Record<string, unknown>
  }
}
