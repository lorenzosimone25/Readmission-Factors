import type {
  CaseClinicalSummary,
  FactorConfidence,
} from '@/features/readmission/types/readmissionAnnotation';

export const DIAGNOSIS_PLACEHOLDER =
  'e.g. Heart failure exacerbation, pneumonia, acute kidney injury';

export const SYMPTOMS_PLACEHOLDER = 'e.g. Dyspnea, chest pain, fatigue';

export const CASE_SETUP_DIAGNOSIS_ERROR =
  'Diagnosis set for readmission is required (enter diagnoses or select Uncertain).';

export const CASE_SETUP_SYMPTOMS_ERROR =
  'Symptoms associated with readmission are required (enter symptoms or select Uncertain).';

export const CASE_SETUP_CONFIDENCE_ERROR = 'Overall confidence score (1–5) is required.';

export const CASE_SETUP_ERROR_MESSAGES = [
  CASE_SETUP_DIAGNOSIS_ERROR,
  CASE_SETUP_SYMPTOMS_ERROR,
  CASE_SETUP_CONFIDENCE_ERROR,
] as const;

export type CaseSetupStatusBadge = {
  key: 'dx' | 'sx' | 'conf';
  label: string;
  tone: 'complete' | 'uncertain' | 'empty';
};

function normalizeOverallConfidence(value: unknown): FactorConfidence | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return null;
}

export function emptyCaseClinicalSummary(): CaseClinicalSummary {
  return {
    readmissionDiagnoses: '',
    readmissionDiagnosesUncertain: false,
    readmissionSymptoms: '',
    readmissionSymptomsUncertain: false,
    overallConfidence: null,
  };
}

export function normalizeCaseClinicalSummary(raw: unknown): CaseClinicalSummary {
  if (!raw || typeof raw !== 'object') return emptyCaseClinicalSummary();
  const r = raw as Partial<CaseClinicalSummary>;
  return {
    readmissionDiagnoses:
      typeof r.readmissionDiagnoses === 'string' ? r.readmissionDiagnoses : '',
    readmissionDiagnosesUncertain: r.readmissionDiagnosesUncertain === true,
    readmissionSymptoms: typeof r.readmissionSymptoms === 'string' ? r.readmissionSymptoms : '',
    readmissionSymptomsUncertain: r.readmissionSymptomsUncertain === true,
    overallConfidence: normalizeOverallConfidence(r.overallConfidence),
  };
}

/** Parse comma-separated free text into trimmed, non-empty entries. */
export function parseCommaSeparatedEntries(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Remove one parsed entry by index and return updated comma-separated text. */
export function removeCommaSeparatedEntry(value: string, index: number): string {
  const parts = parseCommaSeparatedEntries(value);
  if (index < 0 || index >= parts.length) return value;
  parts.splice(index, 1);
  return parts.join(', ');
}

export function isDiagnosesComplete(summary: CaseClinicalSummary): boolean {
  return summary.readmissionDiagnosesUncertain || summary.readmissionDiagnoses.trim().length > 0;
}

export function isSymptomsComplete(summary: CaseClinicalSummary): boolean {
  return summary.readmissionSymptomsUncertain || summary.readmissionSymptoms.trim().length > 0;
}

export function isOverallConfidenceComplete(summary: CaseClinicalSummary): boolean {
  const c = summary.overallConfidence;
  return c !== null && c >= 1 && c <= 5;
}

export function isCaseClinicalSummaryComplete(summary: CaseClinicalSummary): boolean {
  return (
    isDiagnosesComplete(summary) &&
    isSymptomsComplete(summary) &&
    isOverallConfidenceComplete(summary)
  );
}

export function hasCaseClinicalSummaryEdits(summary: CaseClinicalSummary): boolean {
  return (
    summary.readmissionDiagnoses.trim().length > 0 ||
    summary.readmissionDiagnosesUncertain ||
    summary.readmissionSymptoms.trim().length > 0 ||
    summary.readmissionSymptomsUncertain ||
    summary.overallConfidence !== null
  );
}

export function caseClinicalSummaryPreview(summary: CaseClinicalSummary): string {
  return caseSetupStatusBadges(summary)
    .map((badge) => badge.label)
    .join(' · ');
}

export function hasCaseSetupSubmitErrors(errors: string[]): boolean {
  return errors.some((message) =>
    (CASE_SETUP_ERROR_MESSAGES as readonly string[]).includes(message),
  );
}

export function humanizeCaseSetupError(message: string): string {
  if (message === CASE_SETUP_DIAGNOSIS_ERROR) {
    return 'Enter readmission diagnoses or mark Uncertain.';
  }
  if (message === CASE_SETUP_CONFIDENCE_ERROR) {
    return 'Set overall case confidence (1–5).';
  }
  return message;
}

export function countIncompleteCaseSetupFields(summary: CaseClinicalSummary): number {
  let count = 0;
  if (!isDiagnosesComplete(summary)) count += 1;
  if (!isSymptomsComplete(summary)) count += 1;
  if (!isOverallConfidenceComplete(summary)) count += 1;
  return count;
}

export function caseSetupStatusBadges(summary: CaseClinicalSummary): CaseSetupStatusBadge[] {
  const dx: CaseSetupStatusBadge = summary.readmissionDiagnosesUncertain
    ? { key: 'dx', label: 'Dx Uncertain', tone: 'uncertain' }
    : isDiagnosesComplete(summary)
      ? { key: 'dx', label: 'Dx done', tone: 'complete' }
      : { key: 'dx', label: 'Dx —', tone: 'empty' };

  const sx: CaseSetupStatusBadge = summary.readmissionSymptomsUncertain
    ? { key: 'sx', label: 'Sx Uncertain', tone: 'uncertain' }
    : isSymptomsComplete(summary)
      ? { key: 'sx', label: 'Sx done', tone: 'complete' }
      : { key: 'sx', label: 'Sx —', tone: 'empty' };

  const conf: CaseSetupStatusBadge = isOverallConfidenceComplete(summary)
    ? {
        key: 'conf',
        label: `Conf ${summary.overallConfidence}/5`,
        tone: 'complete',
      }
    : { key: 'conf', label: 'Conf —', tone: 'empty' };

  return [dx, sx, conf];
}
