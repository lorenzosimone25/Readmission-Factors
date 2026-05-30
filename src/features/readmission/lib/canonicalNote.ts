import { detectSections, sectionTitleAtChar } from '@/features/readmission/lib/detectSections';
import { sectionIdAtChar, sectionTitleAtCharFromStored } from '@/features/readmission/lib/sectionLookup';
import {
  computeCaseNoteVersions,
  computeCaseVersionHash,
} from '@/features/readmission/lib/noteVersionHash';
import type {
  CaseNoteVersions,
  ClinicalNoteType,
  NoteCanonicalVersion,
  NoteSection,
  ReadmissionCase,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

export type CaseNotesCanonical = {
  indexRawNote: string;
  readmissionRawNote: string;
  indexCanonicalNote: string;
  readmissionCanonicalNote: string;
  noteVersionHash: string;
  noteVersions: CaseNoteVersions;
  noteCanonicalVersion: NoteCanonicalVersion;
};

export function isFormattedCanonical(version: NoteCanonicalVersion): boolean {
  return version === 'formatted_v1';
}

export function canonicalNoteText(
  caseData: Pick<
    ReadmissionCase,
    | 'indexRawNote'
    | 'readmissionRawNote'
    | 'indexFormattedNote'
    | 'readmissionFormattedNote'
    | 'noteCanonicalVersion'
  >,
  noteType: ClinicalNoteType,
): string {
  if (isFormattedCanonical(caseData.noteCanonicalVersion)) {
    const formatted =
      noteType === 'index_hf' ? caseData.indexFormattedNote : caseData.readmissionFormattedNote;
    if (formatted?.trim()) return formatted;
  }
  return noteType === 'index_hf' ? caseData.indexRawNote : caseData.readmissionRawNote;
}

export function rawNoteText(
  caseData: Pick<ReadmissionCase, 'indexRawNote' | 'readmissionRawNote'>,
  noteType: ClinicalNoteType,
): string {
  return noteType === 'index_hf' ? caseData.indexRawNote : caseData.readmissionRawNote;
}

export function storedSectionsForNote(
  caseData: Pick<ReadmissionCase, 'indexNoteSections' | 'readmissionNoteSections'>,
  noteType: ClinicalNoteType,
): StoredNoteSection[] {
  const sections =
    noteType === 'index_hf' ? caseData.indexNoteSections : caseData.readmissionNoteSections;
  return sections ?? [];
}

export function sectionsForNote(
  caseData: Pick<
    ReadmissionCase,
    | 'indexRawNote'
    | 'readmissionRawNote'
    | 'indexFormattedNote'
    | 'readmissionFormattedNote'
    | 'indexNoteSections'
    | 'readmissionNoteSections'
    | 'noteCanonicalVersion'
  >,
  noteType: ClinicalNoteType,
): NoteSection[] {
  const stored = storedSectionsForNote(caseData, noteType);
  if (stored.length > 0) {
    const raw = rawNoteText(caseData, noteType);
    return stored.map((s) => ({
      sectionTitle: s.title,
      startChar: s.startChar,
      endChar: s.endChar,
      rawText: raw.slice(s.startChar, s.endChar),
    }));
  }
  return detectSections(rawNoteText(caseData, noteType));
}

export function sectionMetaAtChar(
  caseData: Parameters<typeof sectionsForNote>[0],
  noteType: ClinicalNoteType,
  charIndex: number,
): { sectionTitle: string | null; sectionId: string | null } {
  const stored = storedSectionsForNote(caseData, noteType);
  if (stored.length > 0) {
    return {
      sectionTitle: sectionTitleAtCharFromStored(stored, charIndex),
      sectionId: sectionIdAtChar(stored, charIndex),
    };
  }
  const sections = detectSections(rawNoteText(caseData, noteType));
  return {
    sectionTitle: sectionTitleAtChar(sections, charIndex),
    sectionId: null,
  };
}

export function caseNotesFromReadmissionCase(caseData: ReadmissionCase): CaseNotesCanonical {
  const indexCanonicalNote = canonicalNoteText(caseData, 'index_hf');
  const readmissionCanonicalNote = canonicalNoteText(caseData, 'readmission');
  return {
    indexRawNote: caseData.indexRawNote,
    readmissionRawNote: caseData.readmissionRawNote,
    indexCanonicalNote,
    readmissionCanonicalNote,
    noteVersionHash: caseData.noteVersionHash,
    noteVersions: caseData.noteVersions,
    noteCanonicalVersion: caseData.noteCanonicalVersion,
  };
}

export function computeHashesForCase(
  indexText: string,
  readmissionText: string,
): { noteVersionHash: string; noteVersions: CaseNoteVersions } {
  return {
    noteVersions: computeCaseNoteVersions(indexText, readmissionText),
    noteVersionHash: computeCaseVersionHash(indexText, readmissionText),
  };
}
