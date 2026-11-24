import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** The Service Worker that answers API calls in the browser with the fake handlers. */
export const worker = setupWorker(...handlers)
