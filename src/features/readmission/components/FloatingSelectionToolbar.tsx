import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Highlighter } from 'lucide-react';

import { accentForGroupColor, groupHighlightBackground } from '@/features/readmission/lib/groupColors';
import type { EvidenceGroup, PendingSelection } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  pendingSelection: NonNullable<PendingSelection>;
  activeGroup: EvidenceGroup;
  noteScrollRef: RefObject<HTMLDivElement | null>;
  onHighlight: () => void;
  onDismiss: () => void;
};

type Position = { top: number; left: number };

function rectFromLiveSelection(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function rectFromCharAnchor(
  scrollEl: HTMLElement | null,
  startChar: number,
): DOMRect | null {
  if (!scrollEl) return null;
  const el = scrollEl.querySelector(
    `.note-root [data-char-start="${startChar}"]`,
  ) as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function positionFromRect(rect: DOMRect): Position {
  return {
    top: rect.bottom + window.scrollY + 8,
    left: Math.min(rect.left + window.scrollX, window.innerWidth - 260),
  };
}

export function FloatingSelectionToolbar({
  pendingSelection,
  activeGroup,
  noteScrollRef,
  onHighlight,
  onDismiss,
}: Props) {
  const [pos, setPos] = useState<Position | null>(null);
  const lastToolbarRect = useRef<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    const live = rectFromLiveSelection();
    if (live) {
      lastToolbarRect.current = live;
      setPos(positionFromRect(live));
      return;
    }

    if (lastToolbarRect.current) {
      setPos(positionFromRect(lastToolbarRect.current));
      return;
    }

    const anchor = rectFromCharAnchor(noteScrollRef.current, pendingSelection.startChar);
    if (anchor) {
      lastToolbarRect.current = anchor;
      setPos(positionFromRect(anchor));
      return;
    }

    setPos(null);
  }, [noteScrollRef, pendingSelection.startChar]);

  useEffect(() => {
    lastToolbarRect.current = null;
    updatePosition();
    const onChange = () => requestAnimationFrame(updatePosition);
    document.addEventListener('selectionchange', onChange);
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [pendingSelection, updatePosition]);

  if (!pos) return null;

  return (
    <div
      data-highlight-toolbar
      className="fixed z-[90] flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-md"
      style={{
        top: pos.top,
        left: pos.left,
        borderColor: accentForGroupColor(activeGroup.color),
        background: 'var(--color-panel-solid)',
        boxShadow: 'var(--shadow-panel)',
      }}
      role="toolbar"
    >
      <button
        type="button"
        aria-label={`Highlight as ${activeGroup.label}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onHighlight}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
        style={{
          background: groupHighlightBackground(activeGroup.color),
          color: 'var(--color-text-primary)',
          border: `1px solid ${accentForGroupColor(activeGroup.color)}`,
        }}
      >
        <Highlighter className="h-3.5 w-3.5" />
        Highlight as {activeGroup.label}
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDismiss}
        className="rounded px-1.5 py-1 text-[10px] opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
