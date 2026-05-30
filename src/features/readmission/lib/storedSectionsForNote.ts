import {
  rawNoteText,
  storedSectionsForNote as dbStoredSections,
} from '@/features/readmission/lib/canonicalNote';
import { detectSections } from '@/features/readmission/lib/detectSections';
import type {
  ClinicalNoteType,
  ReadmissionCase,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

function syntheticSectionId(index: number): string {
  return `sec-${String(index + 1).padStart(3, '0')}`;
}

/** Prefer Supabase-stored sections; fall back to client lexicon detection with synthetic ids. */
export function resolvedStoredSections(
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
): StoredNoteSection[] {
  const stored = dbStoredSections(caseData, noteType);
  if (stored.length > 0) return stored;

  const raw = rawNoteText(caseData, noteType);
  return detectSections(raw).map((section, index) => ({
    id: syntheticSectionId(index),
    title: section.sectionTitle,
    startChar: section.startChar,
    endChar: section.endChar,
  }));
}
