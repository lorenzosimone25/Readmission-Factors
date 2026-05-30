import type { StoredNoteSection } from '@/features/readmission/types/readmissionAnnotation';

export function sectionTitleAtCharFromStored(
  sections: StoredNoteSection[],
  charIndex: number,
): string | null {
  for (const s of sections) {
    if (charIndex >= s.startChar && charIndex < s.endChar) return s.title;
  }
  return null;
}

export function sectionIdAtChar(
  sections: StoredNoteSection[],
  charIndex: number,
): string | null {
  for (const s of sections) {
    if (charIndex >= s.startChar && charIndex < s.endChar) return s.id;
  }
  return null;
}
