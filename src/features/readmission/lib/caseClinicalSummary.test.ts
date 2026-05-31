import { describe, expect, it } from 'vitest';

import {
  caseClinicalSummaryPreview,
  caseSetupStatusBadges,
  countIncompleteCaseSetupFields,
  emptyCaseClinicalSummary,
  hasCaseClinicalSummaryEdits,
  hasCaseSetupSubmitErrors,
  humanizeCaseSetupError,
  isCaseClinicalSummaryComplete,
  isDiagnosesComplete,
  isSymptomsComplete,
  normalizeCaseClinicalSummary,
  parseCommaSeparatedEntries,
  removeCommaSeparatedEntry,
  CASE_SETUP_DIAGNOSIS_ERROR,
} from '@/features/readmission/lib/caseClinicalSummary';

describe('caseClinicalSummary', () => {
  it('normalizes missing or partial payloads', () => {
    expect(normalizeCaseClinicalSummary(undefined)).toEqual(emptyCaseClinicalSummary());
    expect(
      normalizeCaseClinicalSummary({
        readmissionDiagnoses: 'HF',
        overallConfidence: 4,
      }),
    ).toEqual({
      readmissionDiagnoses: 'HF',
      readmissionDiagnosesUncertain: false,
      readmissionSymptoms: '',
      readmissionSymptomsUncertain: false,
      overallConfidence: 4,
    });
  });

  it('detects completion via text or uncertain flags', () => {
    const empty = emptyCaseClinicalSummary();
    expect(isDiagnosesComplete(empty)).toBe(false);
    expect(isSymptomsComplete(empty)).toBe(false);
    expect(isCaseClinicalSummaryComplete(empty)).toBe(false);

    expect(
      isDiagnosesComplete({ ...empty, readmissionDiagnosesUncertain: true }),
    ).toBe(true);
    expect(
      isSymptomsComplete({ ...empty, readmissionSymptoms: 'Dyspnea' }),
    ).toBe(true);
    expect(
      isCaseClinicalSummaryComplete({
        readmissionDiagnoses: 'HF',
        readmissionDiagnosesUncertain: false,
        readmissionSymptoms: '',
        readmissionSymptomsUncertain: true,
        overallConfidence: 3,
      }),
    ).toBe(true);
  });

  it('tracks edits for draft status', () => {
    expect(hasCaseClinicalSummaryEdits(emptyCaseClinicalSummary())).toBe(false);
    expect(
      hasCaseClinicalSummaryEdits({
        ...emptyCaseClinicalSummary(),
        overallConfidence: 2,
      }),
    ).toBe(true);
  });

  it('parses comma-separated entries', () => {
    expect(parseCommaSeparatedEntries('')).toEqual([]);
    expect(parseCommaSeparatedEntries('Dyspnea, chest pain ,')).toEqual([
      'Dyspnea',
      'chest pain',
    ]);
  });

  it('removes entries by index', () => {
    expect(removeCommaSeparatedEntry('Dyspnea, Fatigue', 0)).toBe('Fatigue');
    expect(removeCommaSeparatedEntry('Dyspnea', 0)).toBe('');
  });

  it('counts incomplete case setup fields', () => {
    expect(countIncompleteCaseSetupFields(emptyCaseClinicalSummary())).toBe(3);
    expect(
      countIncompleteCaseSetupFields({
        ...emptyCaseClinicalSummary(),
        readmissionDiagnoses: 'HF',
        readmissionSymptomsUncertain: true,
      }),
    ).toBe(1);
  });

  it('builds status badges for collapsed header', () => {
    const badges = caseSetupStatusBadges({
      readmissionDiagnoses: 'Heart failure exacerbation',
      readmissionDiagnosesUncertain: false,
      readmissionSymptoms: '',
      readmissionSymptomsUncertain: true,
      overallConfidence: 4,
    });
    expect(badges.map((b) => b.label)).toEqual(['Dx done', 'Sx Uncertain', 'Conf 4/5']);
    expect(caseClinicalSummaryPreview({
      readmissionDiagnoses: 'Heart failure exacerbation',
      readmissionDiagnosesUncertain: false,
      readmissionSymptoms: '',
      readmissionSymptomsUncertain: true,
      overallConfidence: 4,
    })).toBe('Dx done · Sx Uncertain · Conf 4/5');
  });

  it('humanizes case setup errors and detects submit errors', () => {
    expect(humanizeCaseSetupError(CASE_SETUP_DIAGNOSIS_ERROR)).toBe(
      'Enter readmission diagnoses or mark Uncertain.',
    );
    expect(hasCaseSetupSubmitErrors([CASE_SETUP_DIAGNOSIS_ERROR])).toBe(true);
    expect(hasCaseSetupSubmitErrors(['Some other error'])).toBe(false);
  });
});
