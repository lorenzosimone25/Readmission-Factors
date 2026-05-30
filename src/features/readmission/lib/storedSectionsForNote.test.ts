import { describe, expect, it } from 'vitest';

import { resolvedStoredSections } from '@/features/readmission/lib/storedSectionsForNote';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

function baseCase(overrides: Partial<ReadmissionCase> = {}): ReadmissionCase {
  return {
    rowId: '1',
    caseId: '1',
    patientIdentifier: 'p',
    subjectId: 's',
    indexHadmId: 'i',
    readmitHadmId: 'r',
    indexPrimaryIcdCode: 'I50',
    daysToReadmission: 5,
    reviewerId: 'u1',
    indexRawNote: 'RAW INDEX',
    readmissionRawNote: 'RAW READMIT',
    noteCanonicalVersion: 'raw_v0',
    noteVersionHash: 'h',
    noteVersions: { index: 'a', readmission: 'b' },
    ...overrides,
  };
}

describe('resolvedStoredSections', () => {
  it('returns stored sections from the case when present', () => {
    const stored = [
      { id: 'sec-db-1', title: 'HPI', startChar: 0, endChar: 3 },
      { id: 'sec-db-2', title: 'Plan', startChar: 3, endChar: 9 },
    ];
    const c = baseCase({ indexNoteSections: stored });
    expect(resolvedStoredSections(c, 'index_hf')).toEqual(stored);
  });

  it('falls back to detectSections with synthetic ids when stored sections are absent', () => {
    const note = [
      'Preamble text',
      '',
      'Chief Complaint:',
      'Chest pain',
      '',
      'Hospital Course:',
      'Admitted for HF.',
    ].join('\n');
    const c = baseCase({ indexRawNote: note });
    const sections = resolvedStoredSections(c, 'index_hf');

    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0]!.id).toBe('sec-001');
    expect(sections.every((section) => section.id.startsWith('sec-'))).toBe(true);
    expect(sections.some((section) => section.title === 'Chief Complaint')).toBe(true);
  });

  it('uses readmission stored sections for readmission note type', () => {
    const stored = [{ id: 'r-1', title: 'Discharge', startChar: 0, endChar: 5 }];
    const c = baseCase({ readmissionNoteSections: stored, readmissionRawNote: 'HELLO' });
    expect(resolvedStoredSections(c, 'readmission')).toEqual(stored);
  });
});
