import { createPresetGroup } from '@/features/readmission/lib/annotationReducer';
import type { EvidenceGroup } from '@/features/readmission/types/readmissionAnnotation';

/** One preset factor so clinicians can highlight immediately. */
export function createDefaultEvidenceGroups(): EvidenceGroup[] {
  return [createPresetGroup()];
}
