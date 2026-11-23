import { API_BASE_URL } from '../config'
import { getToken } from '../auth/token'
import type { ApiErrorBody } from './types'

/**
 * Every failed call throws an ApiError. Screens decide what to show by `code`
 * (catalogue in 5.8.4.3), never by `message`. `message` is a ready English sentence.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly rule?: string
  readonly details?: Record<string, unknown>

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.error.code
    this.rule = body.error.rule
    this.details = body.error.details
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH'
type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>

let unauthorizedHandler: (() => void) | null = null

/** Called once by AuthProvider: what to do when a logged-in call gets 401 (token expired). */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function buildUrl(path: string, query?: object): string {
  const url = new URL(API_BASE_URL + path, window.location.origin)
  for (const [key, value] of Object.entries((query ?? {}) as Query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const error = (value as { error: unknown }).error
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: { body?: unknown; query?: object } = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, {
      error: { code: 'NETWORK_ERROR', message: 'Cannot reach the server. Check your connection and try again.' },
    })
  }

  const text = await response.text()
  const data = text ? parseJson(text) : undefined

  if (!response.ok) {
    const body: ApiErrorBody = isApiErrorBody(data)
      ? data
      : { error: { code: `HTTP_${response.status}`, message: 'Something went wrong. Please try again.' } }
    if (response.status === 401 && token) unauthorizedHandler?.()
    throw new ApiError(response.status, body)
  }

  return data as T
}
