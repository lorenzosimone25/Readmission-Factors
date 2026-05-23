import { hasSupabase } from '@/lib/supabaseClient';

/** True when the SPA should use Supabase (not client parquet or fixtures). */
export function hasReadmissionBackend(): boolean {
  return hasSupabase() && import.meta.env.VITE_USE_MOCK_CASES !== 'true';
}
