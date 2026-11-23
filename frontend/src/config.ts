const DEFAULT_API_URL = 'http://localhost:3000/api/v1'

if (!import.meta.env.VITE_API_URL) {
  console.warn(`VITE_API_URL is not set. Using ${DEFAULT_API_URL}. Copy .env.example to .env.local.`)
}

/** Base URL of the API, without a trailing slash, e.g. http://localhost:3000/api/v1 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '')

/** Business time zone of CampusSlot (5.8.4.1, NFR-10). All times are shown in this zone. */
export const TIME_ZONE = 'Europe/Istanbul'
