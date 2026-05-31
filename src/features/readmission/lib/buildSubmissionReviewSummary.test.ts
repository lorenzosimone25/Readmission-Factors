import { describe, expect, it } from 'vitest';

import { buildSubmissionReviewSummary } from '@/features/readmission/lib/buildSubmissionReviewSummary';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

function baseAnnotation(): ClinicianReadmissionAnnotation {
  const groups = createDefaultEvidenceGroups();
  const group = groups[0]!;
  return {
    caseId: 'case-1',
    reviewerId: 'rev-1',
    noteVersionHash: 'hash-1',
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
        note: 'Patient stopped diuretic.',
        evidenceSpanIds: ['sp1'],
      },
      {
        id: 'f2',
        label: 'Social support',
        role: 'contributing',
        modifiability: 'uncertain',
        foreseeableFromIndexDischarge: 'uncertain',
        confidence: 3,
        rationale: '',
        note: '',
        evidenceSpanIds: ['sp2'],
      },
    ],
    evidenceSpans: [
      {
        id: 'sp1',
        caseId: 'case-1',
        noteType: 'readmission',
        groupId: group.id,
        factorId: 'f1',
        sectionTitle: 'HPI',
        startChar: 0,
        endChar: 20,
        selectedText: 'stopped taking lasix yesterday morning',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sp2',
        caseId: 'case-1',
        noteType: 'index_hf',
        groupId: group.id,
        factorId: 'f2',
        sectionTitle: 'Social',
        startChar: 0,
        endChar: 15,
        selectedText: 'lives alone now',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    caseClinicalSummary: {
      readmissionDiagnoses: 'Heart failure exacerbation, pneumonia',
      readmissionDiagnosesUncertain: false,
      readmissionSymptoms: 'Dyspnea, fatigue',
      readmissionSymptomsUncertain: false,
      overallConfidence: 4,
    },
  };
}

describe('buildSubmissionReviewSummary', () => {
  it('returns null for missing annotation', () => {
    expect(buildSubmissionReviewSummary(null)).toBeNull();
    expect(buildSubmissionReviewSummary(undefined)).toBeNull();
  });

  it('formats case setup for text and uncertain values', () => {
    const summary = buildSubmissionReviewSummary({
      ...baseAnnotation(),
      caseClinicalSummary: {
        readmissionDiagnoses: '',
        readmissionDiagnosesUncertain: true,
        readmissionSymptoms: 'Dyspnea',
        readmissionSymptomsUncertain: false,
        overallConfidence: 5,
      },
    });
    expect(summary?.caseSetup.diagnoses).toBe('Uncertain');
    expect(summary?.caseSetup.symptoms).toBe('Dyspnea');
    expect(summary?.caseSetup.overallConfidenceLabel).toBe('Very high');
  });

  it('orders primary factors before contributing', () => {
    const ann = baseAnnotation();
    ann.evidenceGroups.push({
      id: 'group-2',
      label: 'Social support',
      color: 'blue',
      finalizedFactorId: 'f2',
      note: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const summary = buildSubmissionReviewSummary(ann);
    expect(summary?.factors.map((f) => f.label)).toEqual([
      'Medication non-adherence',
      'Social support',
    ]);
    expect(summary?.factors[0]?.role).toBe('primary');
  });

  it('maps evidence previews and overflow count', () => {
    const ann = baseAnnotation();
    ann.evidenceSpans.push(
      {
        id: 'sp3',
        caseId: 'case-1',
        noteType: 'readmission',
        groupId: ann.evidenceGroups[0]!.id,
        factorId: 'f1',
        sectionTitle: 'Meds',
        startChar: 20,
        endChar: 40,
        selectedText: 'missed follow up appointment last week',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sp4',
        caseId: 'case-1',
        noteType: 'readmission',
        groupId: ann.evidenceGroups[0]!.id,
        factorId: 'f1',
        sectionTitle: 'Meds',
        startChar: 40,
        endChar: 60,
        selectedText: 'ran out of medications completely',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sp5',
        caseId: 'case-1',
        noteType: 'readmission',
        groupId: ann.evidenceGroups[0]!.id,
        factorId: 'f1',
        sectionTitle: 'Meds',
        startChar: 60,
        endChar: 80,
        selectedText: 'no home health services arranged',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    );
    ann.factors[0]!.evidenceSpanIds = ['sp1', 'sp3', 'sp4', 'sp5'];

    const factor = buildSubmissionReviewSummary(ann)?.factors[0];
    expect(factor?.evidencePreviews.length).toBe(3);
    expect(factor?.evidenceOverflowCount).toBe(1);
    expect(factor?.note).toBe('Patient stopped diuretic.');
  });

  it('handles partial annotation without throwing', () => {
    const summary = buildSubmissionReviewSummary({
      caseId: 'x',
      reviewerId: 'y',
      noteVersionHash: 'z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: 'draft',
      evidenceGroups: [],
      factors: [],
      evidenceSpans: [],
    });
    expect(summary?.factors).toEqual([]);
    expect(summary?.caseSetup.diagnoses).toBe('—');
  });
});
