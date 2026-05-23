import { describe, expect, it } from 'vitest';

import { buildNoteSegments } from '@/features/readmission/lib/buildNoteSegments';
import { detectSections } from '@/features/readmission/lib/detectSections';
import type { EvidenceSpan } from '@/features/readmission/types/readmissionAnnotation';

describe('buildNoteSegments', () => {
  const rawNote = 'Line one.\n\nChief Complaint:\nChest pain.';

  it('does not split segments on section boundaries alone', () => {
    const sections = detectSections(rawNote);
    const segments = buildNoteSegments(rawNote, sections, []);
    const boundaryChars = new Set<number>();
    for (const s of sections) {
      boundaryChars.add(s.startChar);
      boundaryChars.add(s.endChar);
    }
    for (const seg of segments) {
      const internalEnds = [seg.endChar];
      for (const b of internalEnds) {
        if (b > seg.startChar && b < seg.endChar && boundaryChars.has(b)) {
          // segment should not end solely because of a section boundary unless note edge or span edge
        }
      }
    }
    expect(segments.length).toBe(1);
    expect(segments[0]!.startChar).toBe(0);
    expect(segments[0]!.endChar).toBe(rawNote.length);
  });

  it('splits on highlight span edges', () => {
    const sections = detectSections(rawNote);
    const spans: EvidenceSpan[] = [
      {
        id: 'sp-1',
        caseId: 'c1',
        noteType: 'readmission',
        groupId: 'g1',
        factorId: null,
        sectionTitle: 'HPI',
        startChar: 0,
        endChar: 8,
        selectedText: rawNote.slice(0, 8),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const segments = buildNoteSegments(rawNote, sections, spans);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.some((s) => s.highlightGroupIds.includes('g1'))).toBe(true);
  });
});
