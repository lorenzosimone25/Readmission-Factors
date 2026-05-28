import type { EvidenceSpan, NoteSection, NoteSegment } from '@/features/readmission/types/readmissionAnnotation';

function uniqueSorted(boundaries: number[]): number[] {
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

function sectionForChar(sections: NoteSection[], charIndex: number): string {
  for (const s of sections) {
    if (charIndex >= s.startChar && charIndex < s.endChar) return s.sectionTitle;
  }
  return sections[0]?.sectionTitle ?? 'Full Note';
}

function spansForInterval(
  startChar: number,
  endChar: number,
  spans: EvidenceSpan[],
): EvidenceSpan[] {
  const matched: EvidenceSpan[] = [];
  for (const sp of spans) {
    if (sp.startChar < endChar && sp.endChar > startChar) {
      matched.push(sp);
    }
  }
  return matched;
}

function isHeadingLine(text: string, sectionTitle: string): boolean {
  const trimmed = text.trim();
  const normalizedTitle = sectionTitle.trim();
  return (
    trimmed === normalizedTitle ||
    trimmed === `${normalizedTitle}:` ||
    trimmed.startsWith(`${normalizedTitle}:`)
  );
}

export function buildNoteSegments(
  rawNote: string,
  sections: NoteSection[],
  evidenceSpans: EvidenceSpan[],
): NoteSegment[] {
  // Section boundaries are metadata-only (TOC, span.sectionTitle). Do not split DOM
  // segments on sections — that breaks cross-section text selection and mapping.
  const boundaries = uniqueSorted([
    0,
    rawNote.length,
    ...evidenceSpans.flatMap((sp) => [sp.startChar, sp.endChar]),
  ]);

  const segments: NoteSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startChar = boundaries[i]!;
    const endChar = boundaries[i + 1]!;
    if (startChar >= endChar) continue;

    const text = rawNote.slice(startChar, endChar);
    const sectionTitle = sectionForChar(sections, startChar);
    const matchedSpans = spansForInterval(startChar, endChar, evidenceSpans);
    const highlightGroupIds = [...new Set(matchedSpans.map((sp) => sp.groupId))];
    const highlightSpanIds = matchedSpans.map((sp) => sp.id);

    segments.push({
      startChar,
      endChar,
      text,
      sectionTitle,
      highlightGroupIds,
      highlightSpanIds,
      isHeadingLine: isHeadingLine(text, sectionTitle),
    });
  }

  return segments;
}
