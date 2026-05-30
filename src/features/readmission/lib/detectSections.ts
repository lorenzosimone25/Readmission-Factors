import {
  GENERIC_HEADING_RE,
  SECTION_LEXICON,
  buildAliasToTitleMap,
  buildLexiconHeadingPattern,
  footerStart,
  fuzzyMapHeading,
  isDeniedHeading,
} from '@/features/readmission/lib/sectionLexicon';
import type { NoteSection } from '@/features/readmission/types/readmissionAnnotation';

type HeadingMatch = {
  sectionTitle: string;
  startChar: number;
};

function collectHeadingMatches(rawNote: string): HeadingMatch[] {
  const aliasToTitle = buildAliasToTitleMap();
  const lexiconRe = buildLexiconHeadingPattern();
  const footerAt = footerStart(rawNote);
  const matches: HeadingMatch[] = [];
  const seenStarts = new Set<number>();

  let m: RegExpExecArray | null;
  while ((m = lexiconRe.exec(rawNote)) !== null) {
    const startChar = m.index + (m[1]?.length ?? 0);
    if (seenStarts.has(startChar)) continue;
    if (footerAt !== null && startChar >= footerAt) continue;
    const rawHeading = (m[2] ?? '').trim();
    if (!rawHeading || isDeniedHeading(rawHeading)) continue;
    const title = aliasToTitle.get(rawHeading.trim().replace(/\s+/g, ' ').toUpperCase());
    if (!title) continue;
    seenStarts.add(startChar);
    matches.push({ sectionTitle: title, startChar });
  }

  GENERIC_HEADING_RE.lastIndex = 0;
  while ((m = GENERIC_HEADING_RE.exec(rawNote)) !== null) {
    const startChar = m.index + (m[1]?.length ?? 0);
    if (seenStarts.has(startChar)) continue;
    if (footerAt !== null && startChar >= footerAt) continue;
    const rawHeading = (m[2] ?? '').trim();
    if (!rawHeading || isDeniedHeading(rawHeading)) continue;
    const mapped = fuzzyMapHeading(rawHeading, aliasToTitle);
    const title = mapped ?? rawHeading.replace(/\b\w/g, (ch) => ch.toUpperCase());
    seenStarts.add(startChar);
    matches.push({ sectionTitle: title, startChar });
  }

  matches.sort((a, b) => a.startChar - b.startChar);
  return matches;
}

export function detectSections(rawNote: string): NoteSection[] {
  const matches = collectHeadingMatches(rawNote);
  if (matches.length === 0) {
    return [
      {
        sectionTitle: 'Full Note',
        startChar: 0,
        endChar: rawNote.length,
        rawText: rawNote,
      },
    ];
  }

  const sections: NoteSection[] = [];

  if (SECTION_LEXICON.preambleBeforeFirst && matches[0]!.startChar > 0) {
    const endChar = matches[0]!.startChar;
    sections.push({
      sectionTitle: 'Preamble',
      startChar: 0,
      endChar,
      rawText: rawNote.slice(0, endChar),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const startChar = matches[i]!.startChar;
    const endChar = i + 1 < matches.length ? matches[i + 1]!.startChar : rawNote.length;
    sections.push({
      sectionTitle: matches[i]!.sectionTitle,
      startChar,
      endChar,
      rawText: rawNote.slice(startChar, endChar),
    });
  }

  return sections;
}

export function sectionTitleAtChar(sections: NoteSection[], charIndex: number): string | null {
  for (const s of sections) {
    if (charIndex >= s.startChar && charIndex < s.endChar) return s.sectionTitle;
  }
  return null;
}
