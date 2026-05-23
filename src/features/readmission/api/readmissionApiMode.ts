import { hasLiveApi } from '@/services/api';

/** True when the SPA should use FastAPI + Postgres (not client parquet or fixtures). */
export function hasReadmissionBackend(): boolean {
  return hasLiveApi() && import.meta.env.VITE_USE_MOCK_CASES !== 'true';
}
