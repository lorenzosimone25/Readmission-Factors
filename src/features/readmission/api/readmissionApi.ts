import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { readmissionApiLocal } from '@/features/readmission/api/readmissionApiLocal';
import { readmissionApiSupabase } from '@/features/readmission/api/readmissionApiSupabase';

export type { ReadmissionApi } from '@/features/readmission/api/readmissionApiTypes';
export { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';

export const readmissionApi = hasReadmissionBackend()
  ? readmissionApiSupabase
  : readmissionApiLocal;

/** @deprecated Use auth user id when Supabase is enabled. */
export const DEFAULT_REVIEWER_ID = 'clinician-demo-01';
