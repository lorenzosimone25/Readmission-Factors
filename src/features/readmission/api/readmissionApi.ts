import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { readmissionApiBackend } from '@/features/readmission/api/readmissionApiBackend';
import { readmissionApiLocal } from '@/features/readmission/api/readmissionApiLocal';

export type { ReadmissionApi } from '@/features/readmission/api/readmissionApiTypes';
export { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';

export const readmissionApi = hasReadmissionBackend()
  ? readmissionApiBackend
  : readmissionApiLocal;

/** @deprecated Use auth user id when backend is enabled. */
export const DEFAULT_REVIEWER_ID = 'clinician-demo-01';
