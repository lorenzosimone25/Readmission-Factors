/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK?: string;
  readonly VITE_USE_MOCK_CASES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.parquet?url' {
  const url: string;
  export default url;
}
