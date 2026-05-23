import { selectionToOffsets } from '@/features/readmission/lib/selectionToOffsets';
import type { ClinicalNoteType } from '@/features/readmission/types/readmissionAnnotation';

export type HighlightRecord = {
  startChar: number;
  endChar: number;
  selectedText: string;
  sectionTitle: string | null;
};

export type HighlightMappingError = {
  error: string;
};

export function mapSelectionToHighlight(
  sel: Selection | null,
  noteRoot: HTMLElement | null,
  rawNote: string,
  noteType: ClinicalNoteType,
): HighlightRecord | HighlightMappingError | null {
  const result = selectionToOffsets(sel, noteRoot, rawNote, noteType);
  if (!result.selection || result.selection.mappingError) {
    if (result.ok === false && result.error) return { error: result.error };
    return null;
  }
  const { startChar, endChar, selectedText, sectionTitle } = result.selection;
  return { startChar, endChar, selectedText, sectionTitle };
}
