/** Compact preview: first word … last word (or full text if ≤2 words). */
export function highlightPreviewText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.join(' ');
  return `${words[0]}…${words[words.length - 1]}`;
}
