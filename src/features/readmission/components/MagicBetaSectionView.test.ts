import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MagicBetaSectionView,
  segmentsForStoredSection,
} from '@/features/readmission/components/MagicBetaSectionView';
import type { NoteSegment, StoredNoteSection } from '@/features/readmission/types/readmissionAnnotation';

const canonicalNote = 'Pre Chief xx';

const sections: StoredNoteSection[] = [
  { id: 'sec-001', title: 'Preamble', startChar: 0, endChar: 4 },
  { id: 'sec-002', title: 'Chief Complaint', startChar: 4, endChar: 12 },
];

const segments: NoteSegment[] = [
  {
    startChar: 0,
    endChar: 12,
    text: canonicalNote,
    sectionTitle: 'Preamble',
    highlightGroupIds: [],
    highlightSpanIds: [],
    isHeadingLine: false,
  },
];

describe('segmentsForStoredSection', () => {
  it('clips overlapping segments to the section char range', () => {
    const preamble = segmentsForStoredSection(sections[0]!, segments, canonicalNote);
    expect(preamble).toHaveLength(1);
    expect(preamble[0]!.startChar).toBe(0);
    expect(preamble[0]!.endChar).toBe(4);
    expect(preamble[0]!.text).toBe('Pre ');

    const chief = segmentsForStoredSection(sections[1]!, segments, canonicalNote);
    expect(chief).toHaveLength(1);
    expect(chief[0]!.startChar).toBe(4);
    expect(chief[0]!.endChar).toBe(12);
    expect(chief[0]!.text).toBe('Chief xx');
  });

  it('does not duplicate full-note spans across sections', () => {
    const allClipped = sections.flatMap((section) =>
      segmentsForStoredSection(section, segments, canonicalNote),
    );
    const texts = allClipped.map((segment) => segment.text).join('');
    expect(texts).toBe(canonicalNote);
    expect(allClipped.every((segment) => segment.isHeadingLine === false)).toBe(true);
  });
});

describe('MagicBetaSectionView', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders a nav item per section and scrolls within the scroll root on click', () => {
    container = document.createElement('div');
    container.style.height = '200px';
    container.style.overflow = 'auto';
    document.body.appendChild(container);
    const scrollRoot = { current: container };
    root = createRoot(container);

    act(() => {
      root.render(
        createElement(MagicBetaSectionView, {
          sections,
          segments,
          canonicalNote,
          noteType: 'index_hf',
          scrollRootRef: scrollRoot,
          groupById: new Map(),
          factorById: new Map(),
          onHighlightClick: () => {},
        }),
      );
    });

    const navButtons = container.querySelectorAll('[aria-label="Section navigation"] button');
    expect(navButtons).toHaveLength(2);
    expect(navButtons[1]?.textContent).toBe('Chief Complaint');

    const chiefSection = document.getElementById('section-sec-002');
    expect(chiefSection).not.toBeNull();

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 200,
      left: 0,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(chiefSection!, 'getBoundingClientRect').mockReturnValue({
      top: 240,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 160,
      x: 0,
      y: 240,
      toJSON: () => ({}),
    } as DOMRect);

    act(() => {
      navButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.scrollTop).toBe(232);
  });

  it('renders all section blocks while nav shows canonical subset only', () => {
    const extendedSections: StoredNoteSection[] = [
      ...sections,
      { id: 'sec-003', title: 'Outpatient Cardiologist', startChar: 12, endChar: 20 },
    ];
    const extendedNote = `${canonicalNote}Extra`;
    const extendedSegments: NoteSegment[] = [
      {
        startChar: 0,
        endChar: extendedNote.length,
        text: extendedNote,
        sectionTitle: 'Preamble',
        highlightGroupIds: [],
        highlightSpanIds: [],
        isHeadingLine: false,
      },
    ];

    container = document.createElement('div');
    document.body.appendChild(container);
    const scrollRoot = { current: container };
    root = createRoot(container);

    act(() => {
      root.render(
        createElement(MagicBetaSectionView, {
          sections: extendedSections,
          segments: extendedSegments,
          canonicalNote: extendedNote,
          noteType: 'index_hf',
          scrollRootRef: scrollRoot,
          groupById: new Map(),
          factorById: new Map(),
          onHighlightClick: () => {},
        }),
      );
    });

    const navButtons = container.querySelectorAll('[aria-label="Section navigation"] button');
    expect(navButtons).toHaveLength(2);
    expect(container.querySelectorAll('[data-section-id]')).toHaveLength(3);
    expect(document.getElementById('section-sec-003')).not.toBeNull();
  });

  it('renders unique char offset attributes per clipped segment', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const scrollRoot = { current: container };
    root = createRoot(container);

    act(() => {
      root.render(
        createElement(MagicBetaSectionView, {
          sections,
          segments,
          canonicalNote,
          noteType: 'index_hf',
          scrollRootRef: scrollRoot,
          groupById: new Map(),
          factorById: new Map(),
          onHighlightClick: () => {},
        }),
      );
    });

    const spans = container.querySelectorAll('[data-char-start][data-char-end]');
    expect(spans).toHaveLength(2);
    expect(spans[0]?.getAttribute('data-char-start')).toBe('0');
    expect(spans[0]?.getAttribute('data-char-end')).toBe('4');
    expect(spans[1]?.getAttribute('data-char-start')).toBe('4');
    expect(spans[1]?.getAttribute('data-char-end')).toBe('12');
  });
});
