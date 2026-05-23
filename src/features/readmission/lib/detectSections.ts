import { SECTION_HEADING_RE } from '@/features/readmission/lib/clinicalHeadings';
import type { NoteSection } from '@/features/readmission/types/readmissionAnnotation';

type HeadingMatch = {
  sectionTitle: string;
  startChar: number;
};

function collectHeadingMatches(rawNote: string): HeadingMatch[] {
  const matches: HeadingMatch[] = [];
  const re = new RegExp(SECTION_HEADING_RE.source, SECTION_HEADING_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawNote)) !== null) {
    const title = m[2] ?? '';
    if (!title) continue;
    matches.push({
      sectionTitle: title,
      startChar: m.index + (m[1]?.length ?? 0),
    });
  }
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

  if (matches[0]!.startChar > 0) {
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
