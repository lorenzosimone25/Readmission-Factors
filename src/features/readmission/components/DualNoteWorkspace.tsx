import { useEffect, useState, type RefObject } from 'react';

import { GroupColorBar } from '@/features/readmission/components/GroupColorBar';
import {
  NotePaneLayoutControls,
  NoteSplitLayout,
} from '@/features/readmission/components/NoteSplitLayout';
import { NoteViewer } from '@/features/readmission/components/NoteViewer';
import {
  loadNotePaneLayout,
  saveNotePaneLayout,
  type NotePaneLayout,
} from '@/features/readmission/lib/notePaneLayout';
import type {
  ClinicalNoteType,
  EvidenceGroup,
  EvidenceSpan,
  HighlightClickPayload,
  NoteSegment,
  PendingSelection,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

type NotePaneProps = {
  noteType: ClinicalNoteType;
  title: string;
  rawNote: string;
  segments: NoteSegment[];
};

type Props = {
  indexNote: NotePaneProps;
  readmissionNote: NotePaneProps;
  groups: EvidenceGroup[];
  groupById: Map<string, EvidenceGroup>;
  factorById: Map<string, ReadmissionFactor>;
  spansByGroupId: Map<string, EvidenceSpan[]>;
  pendingSelection: PendingSelection;
  setPendingSelectionSafe: (sel: PendingSelection) => void;
  clearPendingSelection: () => void;
  activeGroup: EvidenceGroup | null;
  activeGroupId: string | null;
  indexScrollRef: RefObject<HTMLDivElement | null>;
  readmissionScrollRef: RefObject<HTMLDivElement | null>;
  onSelectGroup: (groupId: string) => void;
  onAddFactor: () => void;
  onHighlightClick: (payload: HighlightClickPayload) => void;
  onAddHighlight: () => void;
};

export function DualNoteWorkspace({
  indexNote,
  readmissionNote,
  groups,
  groupById,
  factorById,
  spansByGroupId,
  pendingSelection,
  setPendingSelectionSafe,
  clearPendingSelection,
  activeGroup,
  activeGroupId,
  indexScrollRef,
  readmissionScrollRef,
  onSelectGroup,
  onAddFactor,
  onHighlightClick,
  onAddHighlight,
}: Props) {
  const [paneLayout, setPaneLayout] = useState<NotePaneLayout>(loadNotePaneLayout);

  useEffect(() => {
    saveNotePaneLayout(paneLayout);
  }, [paneLayout]);

  const selectionReady = Boolean(
    activeGroup && pendingSelection && !pendingSelection.mappingError,
  );

  const indexPane = (
    <NoteViewer
      noteType="index_hf"
      title={indexNote.title}
      rawNote={indexNote.rawNote}
      segments={indexNote.segments}
      groupById={groupById}
      factorById={factorById}
      pendingSelection={pendingSelection}
      setPendingSelectionSafe={setPendingSelectionSafe}
      clearPendingSelection={clearPendingSelection}
      activeGroup={activeGroup}
      noteScrollRef={indexScrollRef}
      onHighlightClick={onHighlightClick}
      onAddHighlight={onAddHighlight}
    />
  );

  const readmissionPane = (
    <NoteViewer
      noteType="readmission"
      title={readmissionNote.title}
      rawNote={readmissionNote.rawNote}
      segments={readmissionNote.segments}
      groupById={groupById}
      factorById={factorById}
      pendingSelection={pendingSelection}
      setPendingSelectionSafe={setPendingSelectionSafe}
      clearPendingSelection={clearPendingSelection}
      activeGroup={activeGroup}
      noteScrollRef={readmissionScrollRef}
      onHighlightClick={onHighlightClick}
      onAddHighlight={onAddHighlight}
    />
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className="shrink-0 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Select a factor, then highlight text in either note. Click a highlight to delete that
            factor.
          </p>
          <NotePaneLayoutControls layout={paneLayout} onLayoutChange={setPaneLayout} />
        </div>
        <div className="mt-2">
          <GroupColorBar
            groups={groups}
            activeGroupId={activeGroupId}
            spansByGroupId={spansByGroupId}
            selectionReady={selectionReady}
            onSelectGroup={onSelectGroup}
            onAddFactor={onAddFactor}
          />
        </div>
      </div>

      <NoteSplitLayout
        layout={paneLayout}
        onLayoutChange={setPaneLayout}
        indexPane={indexPane}
        readmissionPane={readmissionPane}
      />
    </div>
  );
}
