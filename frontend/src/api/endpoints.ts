// One typed function per endpoint of the API contract.
// E01…E23 are the row numbers of the endpoint table in docs/report/5.8_api-design_Batuhan.md (5.8.4.6).
// When the contract changes, change it here in the same pull request.

import { apiRequest } from './client'
import type {
  AdminReservationDto,
  AdminResourceDto,
  AuthResponse,
  AvailabilityResponse,
  CheckInRequest,
  CheckInResponse,
  CreateReservationRequest,
  CreateResourceRequest,
  IsoDate,
  LoginRequest,
  MeResponse,
  NoShowReportRow,
  NotificationDto,
  NotificationPage,
  Page,
  PageQuery,
  PenaltyDto,
  RegisterRequest,
  ReservationDto,
  ReservationStatus,
  ResourceDto,
  ResourceSearchQuery,
  ResourceType,
  UpdateResourceRequest,
  UsageReportResponse,
} from './types'

const id = (value: string) => encodeURIComponent(value)

export const api = {
  auth: {
    /** E01 · UC-01 */
    register: (body: RegisterRequest) => apiRequest<AuthResponse>('POST', '/auth/register', { body }),
    /** E02 · UC-01 */
    login: (body: LoginRequest) => apiRequest<AuthResponse>('POST', '/auth/login', { body }),
    /** E03 · UC-01, UC-10 */
    me: () => apiRequest<MeResponse>('GET', '/auth/me'),
  },

  resources: {
    /** E04 · UC-02 */
    search: (query: ResourceSearchQuery = {}) => apiRequest<Page<ResourceDto>>('GET', '/resources', { query }),
    /** E05 · UC-02 */
    get: (resourceId: string) => apiRequest<ResourceDto>('GET', `/resources/${id(resourceId)}`),
    /** E06 · UC-02 */
    availability: (resourceId: string, date: IsoDate) =>
      apiRequest<AvailabilityResponse>('GET', `/resources/${id(resourceId)}/availability`, { query: { date } }),
  },

  reservations: {
    /** E07 · UC-03 */
    create: (body: CreateReservationRequest) => apiRequest<ReservationDto>('POST', '/reservations', { body }),
    /** E08 · UC-10 */
    mine: (query: PageQuery & { status?: ReservationStatus[] } = {}) =>
      apiRequest<Page<ReservationDto>>('GET', '/reservations/me', {
        query: { ...query, status: query.status?.join(',') },
      }),
    /** E09 · UC-10, UC-06 */
    get: (reservationId: string) => apiRequest<ReservationDto>('GET', `/reservations/${id(reservationId)}`),
    /** E10 · UC-04 */
    cancel: (reservationId: string) =>
      apiRequest<ReservationDto>('POST', `/reservations/${id(reservationId)}/cancel`),
  },

  checkIns: {
    /** E11 · UC-05 */
    create: (body: CheckInRequest) => apiRequest<CheckInResponse>('POST', '/check-ins', { body }),
  },

  notifications: {
    /** E12 · UC-10 */
    list: (query: PageQuery & { unreadOnly?: boolean } = {}) =>
      apiRequest<NotificationPage>('GET', '/notifications', { query }),
    /** E13 · UC-10 */
    markRead: (notificationId: string) =>
      apiRequest<NotificationDto>('PATCH', `/notifications/${id(notificationId)}/read`),
  },

  admin: {
    /** E14 · UC-06 */
    pendingReservations: (query: PageQuery = {}) =>
      apiRequest<Page<AdminReservationDto>>('GET', '/admin/reservations/pending', { query }),
    /** E15 · UC-06 */
    approve: (reservationId: string) =>
      apiRequest<ReservationDto>('POST', `/admin/reservations/${id(reservationId)}/approve`),
    /** E16 · UC-06 */
    reject: (reservationId: string, reason: string) =>
      apiRequest<ReservationDto>('POST', `/admin/reservations/${id(reservationId)}/reject`, { body: { reason } }),
    /** E17 · UC-07 */
    resources: (query: ResourceSearchQuery & { includeInactive?: boolean } = {}) =>
      apiRequest<Page<AdminResourceDto>>('GET', '/admin/resources', { query }),
    /** E18 · UC-07 */
    createResource: (body: CreateResourceRequest) =>
      apiRequest<AdminResourceDto>('POST', '/admin/resources', { body }),
    /** E19 · UC-07 */
    updateResource: (resourceId: string, body: UpdateResourceRequest) =>
      apiRequest<AdminResourceDto>('PATCH', `/admin/resources/${id(resourceId)}`, { body }),
    /** E20 · UC-08 */
    usageReport: (query: { from: IsoDate; to: IsoDate; type?: ResourceType }) =>
      apiRequest<UsageReportResponse>('GET', '/admin/reports/usage', { query }),
    /** E21 · UC-08 */
    noShowReport: (query: PageQuery & { from: IsoDate; to: IsoDate }) =>
      apiRequest<Page<NoShowReportRow>>('GET', '/admin/reports/no-shows', { query }),
    /** E22 · UC-08 (F8) */
    penalties: (query: PageQuery & { active?: boolean } = {}) =>
      apiRequest<Page<PenaltyDto>>('GET', '/admin/penalties', { query }),
  },

  /** E23 */
  health: () => apiRequest<{ status: 'ok'; time: string }>('GET', '/health'),
}
