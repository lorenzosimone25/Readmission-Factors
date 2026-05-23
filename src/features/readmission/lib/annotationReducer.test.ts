import { describe, expect, it } from 'vitest';

import {
  addEvidenceGroupToAnnotation,
  addSpanToAnnotation,
  createPresetGroup,
  removeEvidenceGroupFromAnnotation,
  resolveActiveGroupId,
} from '@/features/readmission/lib/annotationReducer';
import type { ClinicianReadmissionAnnotation, EvidenceSpan } from '@/features/readmission/types/readmissionAnnotation';

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

function span(groupId: string, start: number, end: number): EvidenceSpan {
  return {
    id: `span-${start}`,
    caseId: 'case-1',
    noteType: 'readmission',
    groupId,
    factorId: null,
    sectionTitle: 'HPI',
    startChar: start,
    endChar: end,
    selectedText: 'x'.repeat(end - start),
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('annotationReducer', () => {
  it('adds a group with auto label and color', () => {
    const prev = baseAnnotation();
    const { annotation, group } = addEvidenceGroupToAnnotation(prev);
    expect(annotation.evidenceGroups).toHaveLength(2);
    expect(group.label).toBe('Factor 2');
    expect(group.color).toBe('blue');
  });

  it('resolves active group to first when id is missing', () => {
    const prev = baseAnnotation();
    const id = prev.evidenceGroups[0]!.id;
    expect(resolveActiveGroupId(prev, 'missing')).toBe(id);
    expect(resolveActiveGroupId(prev, null)).toBe(id);
  });

  it('removes group and restores preset when last is deleted', () => {
    const prev = baseAnnotation();
    const onlyId = prev.evidenceGroups[0]!.id;
    const next = removeEvidenceGroupFromAnnotation(prev, onlyId);
    expect(next.evidenceGroups).toHaveLength(1);
    expect(next.evidenceGroups[0]!.label).toBe('Factor 1');
  });

  it('adds span to annotation', () => {
    const prev = baseAnnotation();
    const groupId = prev.evidenceGroups[0]!.id;
    const next = addSpanToAnnotation(prev, span(groupId, 0, 5));
    expect(next.evidenceSpans).toHaveLength(1);
    expect(next.status).toBe('draft');
  });
});
