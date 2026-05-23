/** Collapse whitespace runs for selection validation (does not mutate stored note). */
export function normalizeWs(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
