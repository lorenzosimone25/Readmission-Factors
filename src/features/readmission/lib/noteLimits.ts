export const MAX_FACTOR_NOTE_WORDS = 500;

/** Count words (whitespace-separated tokens). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Truncate to at most maxWords words, preserving leading portion. */
export function truncateToWordLimit(text: string, maxWords: number = MAX_FACTOR_NOTE_WORDS): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length <= maxWords) return text;
  return parts.slice(0, maxWords).join(' ');
}

export function isNoteWithinWordLimit(text: string, maxWords: number = MAX_FACTOR_NOTE_WORDS): boolean {
  return countWords(text) <= maxWords;
}
