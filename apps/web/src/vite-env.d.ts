/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEXELS_API_KEY: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
