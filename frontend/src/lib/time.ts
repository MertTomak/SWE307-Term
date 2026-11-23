import { TIME_ZONE } from '../config'

// Every time on screen is shown in Europe/Istanbul, whatever the phone's own time zone is (NFR-10).

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
})

const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, timeStyle: 'short' })

/** "25 Nov 2026, 14:00" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "14:00" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}
