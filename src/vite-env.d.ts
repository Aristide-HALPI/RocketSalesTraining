/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FABRILE_TOKEN: string
  readonly VITE_FABRILE_ORG_ID: string
  readonly VITE_FABRILE_BOT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
