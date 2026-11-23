// Types for the variables in .env.local (Vite only exposes names that start with VITE_).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
