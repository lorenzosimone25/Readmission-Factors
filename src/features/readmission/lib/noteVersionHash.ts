import type { CaseNoteVersions } from '@/features/readmission/types/readmissionAnnotation';

/** FNV-1a 32-bit fallback when crypto.subtle is unavailable. */
function fnv1aHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function computeNoteVersionHash(rawNote: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const encoded = new TextEncoder().encode(rawNote);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    const bytes = Array.from(new Uint8Array(digest));
    return `sha256-${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return fnv1aHash(rawNote);
}

/** Synchronous hash for mock fixtures (FNV only). */
export function computeNoteVersionHashSync(rawNote: string): string {
  return fnv1aHash(rawNote);
}

/** Per-note version hashes for a case. */
export function computeCaseNoteVersions(
  indexRawNote: string,
  readmissionRawNote: string,
): CaseNoteVersions {
  return {
    index: computeNoteVersionHashSync(indexRawNote),
    readmission: computeNoteVersionHashSync(readmissionRawNote),
  };
}

/** Composite hash for draft storage key invalidation. */
export function computeCaseVersionHash(
  indexRawNote: string,
  readmissionRawNote: string,
): string {
  const versions = computeCaseNoteVersions(indexRawNote, readmissionRawNote);
  return fnv1aHash(`${versions.index}\n---\n${versions.readmission}`);
}
