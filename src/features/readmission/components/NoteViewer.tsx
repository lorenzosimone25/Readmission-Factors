import { useCallback, useEffect, type RefObject } from 'react';

import { FloatingSelectionToolbar } from '@/features/readmission/components/FloatingSelectionToolbar';
import { MagicBetaSectionView } from '@/features/readmission/components/MagicBetaSectionView';
import { NoteDocument } from '@/features/readmission/components/NoteDocument';
import { selectionToOffsets, type SectionMetaAtChar } from '@/features/readmission/lib/selectionToOffsets';
import type {
  ClinicalNoteType,
  EvidenceGroup,
  HighlightClickPayload,
  NoteSegment,
  PendingSelection,
  ReadmissionFactor,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  noteType: ClinicalNoteType;
  title: string;
  canonicalNote: string;
  sectionMetaAtChar?: SectionMetaAtChar;
  segments: NoteSegment[];
  storedSections?: StoredNoteSection[];
  magicBetaEnabled?: boolean;
  groupById: Map<string, EvidenceGroup>;
  factorById: Map<string, ReadmissionFactor>;
  pendingSelection: PendingSelection;
  setPendingSelectionSafe: (sel: PendingSelection) => void;
  clearPendingSelection: () => void;
  activeGroup: EvidenceGroup | null;
  noteScrollRef: RefObject<HTMLDivElement | null>;
  onHighlightClick: (payload: HighlightClickPayload) => void;
  onAddHighlight: () => void;
};

function isToolbarFocused(): boolean {
  const active = document.activeElement;
  return Boolean(active?.closest('[data-highlight-toolbar]'));
}

function selectionInRoot(sel: Selection, root: HTMLElement | null): boolean {
  if (!root || !sel.anchorNode) return false;
  return root.contains(sel.anchorNode) || Boolean(sel.focusNode && root.contains(sel.focusNode));
}

export function NoteViewer({
  noteType,
  title,
  canonicalNote,
  sectionMetaAtChar,
  segments,
  storedSections,
  magicBetaEnabled = false,
  groupById,
  factorById,
  pendingSelection,
  setPendingSelectionSafe,
  clearPendingSelection,
  activeGroup,
  noteScrollRef,
  onHighlightClick,
  onAddHighlight,
}: Props) {
  const handleSelection = useCallback(() => {
    if (isToolbarFocused()) return;

    const root = noteScrollRef.current?.querySelector(
      `.note-root[data-note-type="${noteType}"]`,
    ) as HTMLElement | null;
    const sel = window.getSelection();
    if (!root || !sel) return;

    if (!selectionInRoot(sel, root)) return;

    const result = selectionToOffsets(sel, root, canonicalNote, noteType, sectionMetaAtChar);

    if (result.selection) {
      setPendingSelectionSafe(result.selection);
      return;
    }

    if (result.ok === false && result.error) {
      return;
    }

    if (sel.isCollapsed && pendingSelection?.noteType === noteType) {
      return;
    }
  }, [
    noteType,
    noteScrollRef,
    pendingSelection,
    canonicalNote,
    sectionMetaAtChar,
    setPendingSelectionSafe,
  ]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleSelection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingSelection?.noteType === noteType) {
        clearPendingSelection();
        window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearPendingSelection, noteType, pendingSelection]);

  const selectionInThisNote =
    pendingSelection?.noteType === noteType && !pendingSelection.mappingError;
  const canHighlight = Boolean(activeGroup && selectionInThisNote);
  const sectionCount = storedSections?.length ?? 0;
  const useMagicBeta = magicBetaEnabled && sectionCount > 1;
  const showMagicBetaUnavailableHint = magicBetaEnabled && sectionCount <= 1;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <header
        className="shrink-0 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        {showMagicBetaUnavailableHint ? (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Section labels not available — turn off Beta or re-run section labeling
          </p>
        ) : null}
        {pendingSelection?.noteType === noteType && pendingSelection.mappingError ? (
          <div
            className="mt-2 rounded-md border px-2 py-1.5 text-[11px]"
            style={{
              borderColor: 'hsl(32, 85%, 55%)',
              background: 'hsla(38, 90%, 68%, 0.15)',
              color: 'hsl(32, 75%, 32%)',
            }}
            role="alert"
          >
            <p className="font-medium">{pendingSelection.mappingError}</p>
          </div>
        ) : null}
      </header>

      <div
        ref={noteScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        onMouseUp={handleSelection}
      >
        <div
          className="note-root text-[14px] leading-7"
          data-note-type={noteType}
          style={{
            fontFamily: "'IBM Plex Sans', Inter, system-ui, sans-serif",
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          role="document"
        >
          {useMagicBeta ? (
            <MagicBetaSectionView
              sections={storedSections!}
              segments={segments}
              canonicalNote={canonicalNote}
              noteType={noteType}
              scrollRootRef={noteScrollRef}
              groupById={groupById}
              factorById={factorById}
              onHighlightClick={onHighlightClick}
            />
          ) : (
            <NoteDocument
              segments={segments}
              noteType={noteType}
              groupById={groupById}
              factorById={factorById}
              onHighlightClick={onHighlightClick}
            />
          )}
        </div>
      </div>

      {canHighlight && pendingSelection ? (
        <FloatingSelectionToolbar
          pendingSelection={pendingSelection}
          activeGroup={activeGroup!}
          noteScrollRef={noteScrollRef}
          onHighlight={onAddHighlight}
          onDismiss={() => {
            clearPendingSelection();
            window.getSelection()?.removeAllRanges();
          }}
        />
      ) : null}
    </div>
  );
}
