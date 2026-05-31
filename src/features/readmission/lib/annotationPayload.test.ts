import { describe, expect, it } from 'vitest';

import {
  prepareAnnotationForExport,
  prepareAnnotationForPersist,
  reopenSubmittedIfNeeded,
} from '@/features/readmission/lib/annotationPayload';
import { finalizeGroupInAnnotation, createPresetGroup } from '@/features/readmission/lib/annotationReducer';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceSpan,
} from '@/features/readmission/types/readmissionAnnotation';

function baseAnnotation(): ClinicianReadmissionAnnotation {
  const group = createPresetGroup();
  return {
    caseId: 'case-1',
    reviewerId: 'rev-1',
    noteVersionHash: 'hash-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    evidenceGroups: [group],
    factors: [],
    evidenceSpans: [],
  };
}

function span(groupId: string, id: string): EvidenceSpan {
  return {
    id,
    caseId: 'case-1',
    noteType: 'readmission',
    groupId,
    factorId: null,
    sectionTitle: 'HPI',
    startChar: 0,
    endChar: 10,
    selectedText: '0123456789',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('prepareAnnotationForPersist', () => {
  it('draft mode keeps in-progress groups and omits non-UI factor fields', () => {
    let ann = baseAnnotation();
    const groupId = ann.evidenceGroups[0]!.id;
    ann = finalizeGroupInAnnotation(
      {
        ...ann,
        evidenceSpans: [span(groupId, 'span-1')],
      },
      groupId,
      {
        label: 'Heart failure',
        role: 'primary',
        modifiability: 'uncertain',
        foreseeableFromIndexDischarge: 'uncertain',
        confidence: 5,
        rationale: 'should not persist',
        note: '',
      },
    );

    const incomplete = {
      id: 'group-2',
      label: 'Factor 2',
      color: 'blue' as const,
      finalizedFactorId: null,
      note: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    ann = { ...ann, evidenceGroups: [...ann.evidenceGroups, incomplete] };

    const draft = prepareAnnotationForPersist(ann, { mode: 'draft' });
    expect(draft.evidenceGroups).toHaveLength(2);
    expect(draft.factors[0]).not.toHaveProperty('modifiability');
    expect(draft.factors[0]).not.toHaveProperty('foreseeableFromIndexDischarge');
    expect(draft.factors[0]).not.toHaveProperty('rationale');
    expect(draft.factors[0]?.label).toBe('Heart failure');
  });

  it('submit mode drops incomplete groups and non-UI fields', () => {
    let ann = baseAnnotation();
    const groupId = ann.evidenceGroups[0]!.id;
    ann = finalizeGroupInAnnotation(
      {
        ...ann,
        evidenceSpans: [span(groupId, 'span-1')],
      },
      groupId,
      {
        label: 'Primary driver',
        role: 'primary',
        modifiability: 'uncertain',
        foreseeableFromIndexDischarge: 'uncertain',
        confidence: 4,
        rationale: '',
        note: 'optional note',
      },
    );
    ann = {
      ...ann,
      evidenceGroups: [
        ...ann.evidenceGroups,
        {
          id: 'group-open',
          label: 'Factor 2',
          color: 'blue',
          finalizedFactorId: null,
          note: '',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const submitted = prepareAnnotationForPersist(ann, { mode: 'submit' });
    expect(submitted.status).toBe('submitted');
    expect(submitted.evidenceGroups).toHaveLength(1);
    expect(submitted.evidenceGroups[0]?.label).toBe('Primary driver');
    expect(submitted.factors).toHaveLength(1);
    expect(submitted.factors[0]).not.toHaveProperty('modifiability');
  });
});

describe('prepareAnnotationForExport', () => {
  it('matches submit persist shape for finalized content', () => {
    let ann = baseAnnotation();
    const groupId = ann.evidenceGroups[0]!.id;
    ann = finalizeGroupInAnnotation(
      { ...ann, evidenceSpans: [span(groupId, 'span-1')] },
      groupId,
      {
        label: 'Exported factor',
        role: 'contributing',
        modifiability: 'system_level',
        foreseeableFromIndexDischarge: 'yes',
        confidence: 3,
        rationale: 'x',
        note: '',
      },
    );

    const exported = prepareAnnotationForExport(ann);
    expect(exported.factors).toHaveLength(1);
    expect(exported.evidenceSpans).toHaveLength(1);
    expect(exported.factors[0]?.role).toBe('contributing');
    expect(exported.factorSectionSummary).toHaveLength(1);
    expect(exported.factorSectionSummary?.[0]?.sectionTitles).toContain('HPI');
  });

  it('includes caseClinicalSummary in export', () => {
    let ann = baseAnnotation();
    const groupId = ann.evidenceGroups[0]!.id;
    ann = finalizeGroupInAnnotation(
      { ...ann, evidenceSpans: [span(groupId, 'span-1')] },
      groupId,
      {
        label: 'Exported factor',
        role: 'primary',
        modifiability: 'uncertain',
        foreseeableFromIndexDischarge: 'uncertain',
        confidence: 4,
        rationale: '',
        note: '',
      },
    );
    ann = {
      ...ann,
      caseClinicalSummary: {
        readmissionDiagnoses: 'Heart failure exacerbation',
        readmissionDiagnosesUncertain: false,
        readmissionSymptoms: 'Dyspnea',
        readmissionSymptomsUncertain: false,
        overallConfidence: 4,
      },
    };

    const exported = prepareAnnotationForExport(ann);
    expect(exported.caseClinicalSummary?.readmissionDiagnoses).toBe('Heart failure exacerbation');
    expect(exported.caseClinicalSummary?.overallConfidence).toBe(4);
  });
});

describe('reopenSubmittedIfNeeded', () => {
  it('changes submitted status to draft', () => {
    const ann = { ...baseAnnotation(), status: 'submitted' as const };
    const reopened = reopenSubmittedIfNeeded(ann);
    expect(reopened.status).toBe('draft');
  });

  it('leaves draft unchanged', () => {
    const ann = baseAnnotation();
    expect(reopenSubmittedIfNeeded(ann).status).toBe('draft');
  });
});
