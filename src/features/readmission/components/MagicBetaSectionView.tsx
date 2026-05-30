import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { NoteDocument } from '@/features/readmission/components/NoteDocument';
import {
  navSectionsForDisplay,
  resolveActiveNavSectionId,
  type NavSectionItem,
} from '@/features/readmission/lib/sectionNavFilter';
import type {
  ClinicalNoteType,
  EvidenceGroup,
  HighlightClickPayload,
  NoteSegment,
  ReadmissionFactor,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  sections: StoredNoteSection[];
  segments: NoteSegment[];
  canonicalNote: string;
  noteType: ClinicalNoteType;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  groupById: Map<string, EvidenceGroup>;
  factorById: Map<string, ReadmissionFactor>;
  onHighlightClick: (payload: HighlightClickPayload) => void;
};

/** Clip global note segments to a section's char range (no duplicate full-note spans per block). */
export function segmentsForStoredSection(
  section: StoredNoteSection,
  segments: NoteSegment[],
  canonicalNote: string,
): NoteSegment[] {
  const clipped: NoteSegment[] = [];

  for (const segment of segments) {
    if (segment.startChar >= section.endChar || segment.endChar <= section.startChar) continue;

    const startChar = Math.max(segment.startChar, section.startChar);
    const endChar = Math.min(segment.endChar, section.endChar);
    if (startChar >= endChar) continue;

    clipped.push({
      ...segment,
      startChar,
      endChar,
      text: canonicalNote.slice(startChar, endChar),
      isHeadingLine: false,
    });
  }

  return clipped;
}

const OBSERVER_SUPPRESS_MS = 500;

export function MagicBetaSectionView({
  sections,
  segments,
  canonicalNote,
  noteType,
  scrollRootRef,
  groupById,
  factorById,
  onHighlightClick,
}: Props) {
  const navItems = useMemo(() => navSectionsForDisplay(sections), [sections]);
  const initialNavId = navItems[0]?.sectionId ?? sections[0]?.id ?? null;

  const [visibleSectionId, setVisibleSectionId] = useState<string | null>(initialNavId);
  const activeNavSectionId = useMemo(
    () => resolveActiveNavSectionId(visibleSectionId, navItems, sections),
    [visibleSectionId, navItems, sections],
  );

  const sectionElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const navButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const suppressObserverUntilRef = useRef(0);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const scrollRoot = scrollRootRef.current;
      const target = sectionElementsRef.current.get(sectionId);
      if (!scrollRoot || !target) return;

      setVisibleSectionId(sectionId);
      suppressObserverUntilRef.current = Date.now() + OBSERVER_SUPPRESS_MS;

      const rootRect = scrollRoot.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      scrollRoot.scrollTop += targetRect.top - rootRect.top - 8;
    },
    [scrollRootRef],
  );

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressObserverUntilRef.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0]?.target;
        if (!top) return;
        const sectionId = top.getAttribute('data-section-id');
        if (sectionId) setVisibleSectionId(sectionId);
      },
      { root: scrollRoot, rootMargin: '-12% 0px -70% 0px', threshold: [0, 0.1, 0.5] },
    );

    for (const section of sections) {
      const el = sectionElementsRef.current.get(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [scrollRootRef, sections]);

  useEffect(() => {
    if (!activeNavSectionId) return;
    const btn = navButtonRefs.current.get(activeNavSectionId);
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ block: 'nearest' });
    }
  }, [activeNavSectionId]);

  return (
    <div className="flex min-h-0 gap-4">
      <aside
        className="sticky top-0 w-[200px] shrink-0 self-start rounded-lg border px-2 py-2"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <p
          className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Sections
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Section navigation">
          {navItems.map((item) => (
            <NavSectionButton
              key={item.sectionId}
              item={item}
              isActive={activeNavSectionId === item.sectionId}
              onClick={() => scrollToSection(item.sectionId)}
              buttonRef={(el) => {
                if (el) navButtonRefs.current.set(item.sectionId, el);
                else navButtonRefs.current.delete(item.sectionId);
              }}
            />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-8">
          {sections.map((section) => {
            const sectionSegments = segmentsForStoredSection(section, segments, canonicalNote);
            if (sectionSegments.length === 0) return null;

            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                data-section-id={section.id}
                ref={(el) => {
                  if (el) sectionElementsRef.current.set(section.id, el);
                  else sectionElementsRef.current.delete(section.id);
                }}
                className="scroll-mt-2 border-b pb-6 last:border-b-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h3
                  className="mb-3 text-[15px] font-semibold leading-snug"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {section.title}
                </h3>
                <NoteDocument
                  segments={sectionSegments}
                  noteType={noteType}
                  groupById={groupById}
                  factorById={factorById}
                  onHighlightClick={onHighlightClick}
                />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavSectionButton({
  item,
  isActive,
  onClick,
  buttonRef,
}: {
  item: NavSectionItem;
  isActive: boolean;
  onClick: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="relative w-full rounded-md px-2 py-1.5 text-left text-[12px] leading-snug transition-colors"
      style={{
        color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
        background: isActive ? 'hsla(214, 84%, 48%, 0.12)' : 'transparent',
        fontWeight: isActive ? 600 : 400,
        borderLeft: isActive
          ? '3px solid var(--color-accent-blue)'
          : '3px solid transparent',
      }}
      title={item.title}
      aria-current={isActive ? 'true' : undefined}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = 'var(--color-panel-solid)';
      }}
      onMouseLeave={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {item.title}
    </button>
  );
}
