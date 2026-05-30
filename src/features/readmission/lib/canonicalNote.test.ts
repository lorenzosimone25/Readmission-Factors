import { describe, expect, it } from 'vitest';

import {
  canonicalNoteText,
  caseNotesFromReadmissionCase,
  computeHashesForCase,
  sectionsForNote,
  sectionMetaAtChar,
} from '@/features/readmission/lib/canonicalNote';
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

describe('canonicalNoteText', () => {
  it('uses raw notes when canonical version is raw_v0', () => {
    const c = baseCase();
    expect(canonicalNoteText(c, 'index_hf')).toBe('RAW INDEX');
    expect(canonicalNoteText(c, 'readmission')).toBe('RAW READMIT');
  });

  it('uses formatted notes when canonical version is formatted_v1', () => {
    const c = baseCase({
      noteCanonicalVersion: 'formatted_v1',
      indexFormattedNote: 'FMT INDEX',
      readmissionFormattedNote: 'FMT READMIT',
    });
    expect(canonicalNoteText(c, 'index_hf')).toBe('FMT INDEX');
    expect(canonicalNoteText(c, 'readmission')).toBe('FMT READMIT');
  });

  it('falls back to raw when formatted text is empty', () => {
    const c = baseCase({
      noteCanonicalVersion: 'formatted_v1',
      indexFormattedNote: '   ',
      readmissionFormattedNote: '',
    });
    expect(canonicalNoteText(c, 'index_hf')).toBe('RAW INDEX');
  });
});

describe('sectionsForNote', () => {
  it('prefers stored sections sliced from raw note', () => {
    const c = baseCase({
      indexRawNote: 'AAABBBCCC',
      indexNoteSections: [
        { id: 'sec-1', title: 'Stored', startChar: 0, endChar: 3 },
      ],
    });
    const sections = sectionsForNote(c, 'index_hf');
    expect(sections).toHaveLength(1);
    expect(sections[0]!.sectionTitle).toBe('Stored');
    expect(sections[0]!.rawText).toBe('AAA');
  });
});

describe('sectionMetaAtChar', () => {
  it('returns section id from stored sections on raw offsets', () => {
    const c = baseCase({
      indexRawNote: 'ABCDEF',
      indexNoteSections: [
        { id: 'sec-x', title: 'HPI', startChar: 0, endChar: 6 },
      ],
    });
    expect(sectionMetaAtChar(c, 'index_hf', 2)).toEqual({
      sectionTitle: 'HPI',
      sectionId: 'sec-x',
    });
  });
});

describe('caseNotesFromReadmissionCase', () => {
  it('builds canonical note fields for validation', () => {
    const c = baseCase({
      noteCanonicalVersion: 'formatted_v1',
      indexFormattedNote: 'FMT',
      readmissionFormattedNote: 'FMT2',
    });
    const notes = caseNotesFromReadmissionCase(c);
    expect(notes.indexCanonicalNote).toBe('FMT');
    expect(notes.readmissionCanonicalNote).toBe('FMT2');
    expect(notes.indexRawNote).toBe('RAW INDEX');
  });
});

describe('computeHashesForCase', () => {
  it('hashes canonical pair', () => {
    const { noteVersionHash, noteVersions } = computeHashesForCase('a', 'b');
    expect(noteVersions.index).toBeTruthy();
    expect(noteVersionHash).toBeTruthy();
  });
});
