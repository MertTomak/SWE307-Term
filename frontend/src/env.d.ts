// Types for the variables in .env.local (Vite only exposes names that start with VITE_).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** "true" = answer API calls with the fake handlers in src/mocks (development only). */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
