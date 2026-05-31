import { describe, expect, it } from 'vitest';

import { validateForSubmit, hasFactorSubmitErrors } from '@/features/readmission/lib/annotationValidation';
import {
  CASE_SETUP_CONFIDENCE_ERROR,
  CASE_SETUP_DIAGNOSIS_ERROR,
  CASE_SETUP_SYMPTOMS_ERROR,
  emptyCaseClinicalSummary,
} from '@/features/readmission/lib/caseClinicalSummary';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type {
  CaseClinicalSummary,
  ClinicianReadmissionAnnotation,
} from '@/features/readmission/types/readmissionAnnotation';

const canonical = 'Chief Complaint:\nChest pain for two days.';

const notes = {
  indexRawNote: 'raw index',
  readmissionRawNote: 'raw readmit',
  indexCanonicalNote: 'raw index',
  readmissionCanonicalNote: canonical,
  noteVersionHash: 'h',
};

function validFactorAnnotation(
  caseClinicalSummary?: CaseClinicalSummary,
): ClinicianReadmissionAnnotation {
  const groups = createDefaultEvidenceGroups();
  const group = groups[0]!;
  return {
    caseId: '1',
    reviewerId: 'u',
    noteVersionHash: 'h',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    evidenceGroups: [{ ...group, label: 'Medication non-adherence', finalizedFactorId: 'f1' }],
    factors: [
      {
        id: 'f1',
        label: 'Medication non-adherence',
        role: 'primary',
        modifiability: 'uncertain',
        foreseeableFromIndexDischarge: 'uncertain',
        confidence: 4,
        rationale: '',
        note: '',
        evidenceSpanIds: ['sp1'],
      },
    ],
    evidenceSpans: [
      {
        id: 'sp1',
        caseId: '1',
        noteType: 'readmission',
        groupId: group.id,
        factorId: 'f1',
        sectionTitle: 'Chief Complaint',
        startChar: 0,
        endChar: 17,
        selectedText: canonical.slice(0, 17),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    caseClinicalSummary,
  };
}

describe('validateForSubmit canonical offsets', () => {
  it('accepts spans sliced from canonical note', () => {
    const ann = validFactorAnnotation({
      ...emptyCaseClinicalSummary(),
      readmissionDiagnoses: 'Heart failure exacerbation',
      readmissionSymptoms: 'Dyspnea',
      overallConfidence: 4,
    });

    const result = validateForSubmit(ann, notes);
    expect(result.errors.some((e) => e.includes('selectedText does not match'))).toBe(false);
  });
});

describe('validateForSubmit case clinical summary', () => {
  it('blocks submit when case summary is missing even with valid factors', () => {
    const result = validateForSubmit(validFactorAnnotation(), notes);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'Diagnosis set for readmission is required (enter diagnoses or select Uncertain).',
    );
    expect(result.errors).toContain(
      'Symptoms associated with readmission are required (enter symptoms or select Uncertain).',
    );
    expect(result.errors).toContain('Overall confidence score (1–5) is required.');
  });

  it('allows submit when uncertain flags and confidence are set', () => {
    const result = validateForSubmit(
      validFactorAnnotation({
        readmissionDiagnoses: '',
        readmissionDiagnosesUncertain: true,
        readmissionSymptoms: '',
        readmissionSymptomsUncertain: true,
        overallConfidence: 3,
      }),
      notes,
    );
    expect(result.ok).toBe(true);
  });

  it('allows submit with text entries and confidence', () => {
    const result = validateForSubmit(
      validFactorAnnotation({
        readmissionDiagnoses: 'Heart failure exacerbation, pneumonia',
        readmissionDiagnosesUncertain: false,
        readmissionSymptoms: 'Dyspnea, fatigue',
        readmissionSymptomsUncertain: false,
        overallConfidence: 5,
      }),
      notes,
    );
    expect(result.ok).toBe(true);
  });
});

describe('hasFactorSubmitErrors', () => {
  it('ignores case setup and note version errors', () => {
    expect(
      hasFactorSubmitErrors([
        CASE_SETUP_DIAGNOSIS_ERROR,
        CASE_SETUP_SYMPTOMS_ERROR,
        CASE_SETUP_CONFIDENCE_ERROR,
        'Annotation note version hash does not match the current case notes.',
      ]),
    ).toBe(false);
  });

  it('detects factor-related submit errors', () => {
    expect(
      hasFactorSubmitErrors(['At least one primary readmission factor is required.']),
    ).toBe(true);
    const ann = validFactorAnnotation({
      ...emptyCaseClinicalSummary(),
      readmissionDiagnoses: 'HF',
      readmissionSymptoms: 'Dyspnea',
      overallConfidence: 4,
    });
    const incomplete = {
      ...ann,
      evidenceGroups: ann.evidenceGroups.map((g) => ({ ...g, finalizedFactorId: null })),
    };
    expect(hasFactorSubmitErrors(validateForSubmit(incomplete, notes).errors)).toBe(true);
  });

  it('returns false when only case setup blocks submit', () => {
    expect(hasFactorSubmitErrors(validateForSubmit(validFactorAnnotation(), notes).errors)).toBe(
      false,
    );
  });
});
