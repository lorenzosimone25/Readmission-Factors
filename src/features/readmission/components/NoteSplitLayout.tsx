import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Columns2, GripVertical, PanelLeft, PanelRight } from 'lucide-react';

import {
  clampIndexPercent,
  defaultSplitLayout,
  NOTE_PANE_MAX_PERCENT,
  NOTE_PANE_MIN_PERCENT,
  splitIndexPercent,
  type NotePaneLayout,
} from '@/features/readmission/lib/notePaneLayout';

type Props = {
  layout: NotePaneLayout;
  onLayoutChange: (layout: NotePaneLayout) => void;
  indexPane: ReactNode;
  readmissionPane: ReactNode;
};

const controlBtnClass =
  'rounded-md border p-1.5 transition-colors disabled:opacity-40';

export function NotePaneLayoutControls({
  layout,
  onLayoutChange,
}: {
  layout: NotePaneLayout;
  onLayoutChange: (layout: NotePaneLayout) => void;
}) {
  const lastSplitPercent = splitIndexPercent(layout);

  const activeStyle = {
    borderColor: 'var(--color-border-strong)',
    background: 'var(--color-panel-solid)',
    color: 'var(--color-text-primary)',
  };
  const idleStyle = {
    borderColor: 'var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-tertiary)',
  };

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: 'var(--color-border)' }}
      role="group"
      aria-label="Note pane layout"
    >
      <button
        type="button"
        title="Index note only"
        aria-label="Index note only"
        aria-pressed={layout.mode === 'index'}
        className={controlBtnClass}
        style={layout.mode === 'index' ? activeStyle : idleStyle}
        onClick={() => onLayoutChange({ mode: 'index' })}
      >
        <PanelLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        title="Split view"
        aria-label="Split view"
        aria-pressed={layout.mode === 'split'}
        className={controlBtnClass}
        style={layout.mode === 'split' ? activeStyle : idleStyle}
        onClick={() =>
          onLayoutChange({
            mode: 'split',
            indexPercent: lastSplitPercent,
          })
        }
      >
        <Columns2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        title="Readmission note only"
        aria-label="Readmission note only"
        aria-pressed={layout.mode === 'readmission'}
        className={controlBtnClass}
        style={layout.mode === 'readmission' ? activeStyle : idleStyle}
        onClick={() => onLayoutChange({ mode: 'readmission' })}
      >
        <PanelRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function NoteSplitLayout({ layout, onLayoutChange, indexPane, readmissionPane }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startPercent: number } | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const showIndex = layout.mode !== 'readmission';
  const showReadmission = layout.mode !== 'index';
  const indexPercent =
    layout.mode === 'split' ? layout.indexPercent : splitIndexPercent(layout);

  const applySplitPercent = useCallback(
    (clientX: number) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      const rect = container.getBoundingClientRect();
      const deltaPct = ((clientX - drag.startX) / rect.width) * 100;
      const next = clampIndexPercent(drag.startPercent + deltaPct);
      onLayoutChange({ mode: 'split', indexPercent: next });
    },
    [onLayoutChange],
  );

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      applySplitPercent(e.clientX);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [applySplitPercent]);

  const onSeparatorPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (layoutRef.current.mode !== 'split') {
      onLayoutChange(defaultSplitLayout());
    }
    const current =
      layoutRef.current.mode === 'split'
        ? layoutRef.current.indexPercent
        : splitIndexPercent(layoutRef.current);
    dragRef.current = { startX: e.clientX, startPercent: current };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSeparatorKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (layout.mode !== 'split') return;
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -5;
    if (e.key === 'ArrowRight') delta = 5;
    if (!delta) return;
    e.preventDefault();
    onLayoutChange({
      mode: 'split',
      indexPercent: clampIndexPercent(layout.indexPercent + delta),
    });
  };

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 gap-0 p-2">
      {showIndex ? (
        <div
          className="flex min-h-0 min-w-0 flex-col"
          style={{
            flex:
              layout.mode === 'split'
                ? `0 0 ${indexPercent}%`
                : '1 1 100%',
          }}
        >
          {indexPane}
        </div>
      ) : null}

      {layout.mode === 'split' && showIndex && showReadmission ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize notes"
          aria-valuemin={NOTE_PANE_MIN_PERCENT}
          aria-valuemax={NOTE_PANE_MAX_PERCENT}
          aria-valuenow={Math.round(indexPercent)}
          tabIndex={0}
          className="mx-0.5 flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center rounded-sm"
          style={{
            background: 'var(--color-panel-alt)',
            borderLeft: '1px solid var(--color-border)',
            borderRight: '1px solid var(--color-border)',
          }}
          onPointerDown={onSeparatorPointerDown}
          onKeyDown={onSeparatorKeyDown}
        >
          <GripVertical
            className="h-4 w-4 opacity-50"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-hidden
          />
        </div>
      ) : null}

      {showReadmission ? (
        <div
          className="flex min-h-0 min-w-0 flex-col"
          style={{
            flex: layout.mode === 'split' ? '1 1 0' : '1 1 100%',
          }}
        >
          {readmissionPane}
        </div>
      ) : null}
    </div>
  );
}
