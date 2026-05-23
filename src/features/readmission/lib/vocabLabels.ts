import type {
  FactorConfidence,
  FactorModifiability,
  FactorRole,
  ForeseeableFromIndex,
} from '@/features/readmission/types/readmissionAnnotation';

export const ROLE_OPTIONS: { value: FactorRole; label: string; description: string }[] = [
  {
    value: 'primary',
    label: 'Primary',
    description: 'Main reason for this readmission',
  },
  {
    value: 'contributing',
    label: 'Contributing',
    description: 'Contributed but not the main driver',
  },
];

export const CONFIDENCE_SCALE: { value: FactorConfidence; label: string; short: string }[] = [
  { value: 1, label: '1 — Very low', short: 'Very low' },
  { value: 2, label: '2 — Low', short: 'Low' },
  { value: 3, label: '3 — Moderate', short: 'Moderate' },
  { value: 4, label: '4 — High', short: 'High' },
  { value: 5, label: '5 — Very high', short: 'Very high' },
];

export const MODIFIABILITY_OPTIONS: { value: FactorModifiability; label: string }[] = [
  { value: 'non_modifiable', label: 'Non-modifiable' },
  { value: 'potentially_modifiable', label: 'Potentially modifiable' },
  { value: 'outpatient_monitoring_required', label: 'Outpatient monitoring required' },
  { value: 'system_level', label: 'System level' },
  { value: 'uncertain', label: 'Uncertain' },
];

export const FORESEEABLE_OPTIONS: { value: ForeseeableFromIndex; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'uncertain', label: 'Uncertain' },
];

export function roleLabel(role: FactorRole): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export function noteTypeLabel(noteType: 'index_hf' | 'readmission'): string {
  return noteType === 'index_hf' ? 'Index HF' : 'Readmission';
}

/** Map legacy stored roles to the current vocabulary. */
export function normalizeFactorRole(role: string): FactorRole {
  if (role === 'primary') return 'primary';
  return 'contributing';
}
