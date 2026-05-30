import { describe, expect, it } from 'vitest';

import {
  annotationSectionEnvelopeFromCase,
  backfillSpanSectionIds,
} from '@/features/readmission/lib/sectionAnnotation';
import type {
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

const baseCase: ReadmissionCase = {
  rowId: '1',
  caseId: '1',
  patientIdentifier: 'p',
  subjectId: 's',
  indexHadmId: 'i',
  readmitHadmId: 'r',
  indexPrimaryIcdCode: 'I50',
  daysToReadmission: 10,
  reviewerId: 'rev',
  indexRawNote: 'Chief Complaint:\nPain.\n\nBrief Hospital Course:\nBetter.',
  readmissionRawNote: 'Chief Complaint:\nPain again.',
  noteCanonicalVersion: 'raw_v0',
  noteEnrichmentVersion: 'sections-rules-v1',
  indexNoteSections: [
    { id: 'sec-001', title: 'Preamble', startChar: 0, endChar: 0 },
    { id: 'sec-002', title: 'Chief Complaint', startChar: 0, endChar: 20 },
    { id: 'sec-003', title: 'Brief Hospital Course', startChar: 20, endChar: 50 },
  ],
  noteVersionHash: 'hash',
  noteVersions: { index: 'a', readmission: 'b' },
};

describe('sectionAnnotation', () => {
  it('derives enrichment envelope from case', () => {
    expect(annotationSectionEnvelopeFromCase(baseCase)).toEqual({
      noteEnrichmentVersion: 'sections-rules-v1',
      sectionMetaSource: 'stored',
    });
  });

  it('backfills missing sectionId from stored sections', () => {
    const annotation: ClinicianReadmissionAnnotation = {
      caseId: '1',
      reviewerId: 'rev',
      noteVersionHash: 'hash',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: 'draft',
      evidenceGroups: [],
      factors: [],
      evidenceSpans: [
        {
          id: 'sp-1',
          caseId: '1',
          noteType: 'index_hf',
          groupId: 'g1',
          factorId: null,
          sectionTitle: 'Chief Complaint',
          startChar: 0,
          endChar: 8,
          selectedText: 'Chief Co',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const next = backfillSpanSectionIds(annotation, baseCase);
    expect(next.evidenceSpans[0]?.sectionId).toBe('sec-002');
  });
});
