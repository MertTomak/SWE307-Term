import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * Mock API (MSW) for working before the backend exists. Runs only in `npm run dev` and only when
 * VITE_USE_MOCKS=true in .env.local. The import is dynamic, so the mocks are not in the production build.
 */
async function startMocks(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  // Endpoints without a fake handler go to the real API.
  await worker.start({ onUnhandledFrame: 'bypass' })
  console.info('[CampusSlot] Mock API is on (VITE_USE_MOCKS=true). Handlers: src/mocks/handlers.ts')
}

startMocks().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
