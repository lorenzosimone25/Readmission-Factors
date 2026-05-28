import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import type { ClinicalNoteType } from '@/features/readmission/types/readmissionAnnotation';

export type SpanPopoverAnchor = {
  spanId: string;
  noteType: ClinicalNoteType;
  anchorRect: DOMRect;
};

type Props = {
  anchor: SpanPopoverAnchor | null;
  onRemoveHighlight: (spanId: string) => void;
  onDismiss: () => void;
};

type Position = { top: number; left: number };

function positionFromRect(rect: DOMRect): Position {
  return {
    top: rect.bottom + window.scrollY + 8,
    left: Math.min(rect.left + window.scrollX, window.innerWidth - 220),
  };
}

export function HighlightSpanPopover({ anchor, onRemoveHighlight, onDismiss }: Props) {
  const [pos, setPos] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchor) {
      setPos(null);
      return;
    }
    setPos(positionFromRect(anchor.anchorRect));
  }, [anchor]);

  useEffect(() => {
    updatePosition();
    if (!anchor) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchor, updatePosition]);

  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-highlight-popover]')) return;
      if (target?.closest('mark[data-char-start]')) return;
      onDismiss();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [anchor, onDismiss]);

  if (!anchor || !pos) return null;

  return (
    <div
      data-highlight-popover
      className="fixed z-[80] flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-lg"
      style={{
        top: pos.top,
        left: pos.left,
        borderColor: 'var(--color-border-strong)',
        background: 'var(--color-panel-solid)',
      }}
      role="dialog"
      aria-label="Highlight actions"
    >
      <button
        type="button"
        onClick={() => {
          onRemoveHighlight(anchor.spanId);
          onDismiss();
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
        style={{ color: 'var(--color-accent-danger)' }}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remove highlight
      </button>
    </div>
  );
}
