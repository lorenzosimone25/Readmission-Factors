import type { RefObject } from 'react';

import { GroupColorBar } from '@/features/readmission/components/GroupColorBar';
import { NoteViewer } from '@/features/readmission/components/NoteViewer';
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
  const selectionReady = Boolean(
    activeGroup && pendingSelection && !pendingSelection.mappingError,
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className="shrink-0 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Select a factor, then highlight text in either note. Click a highlight to delete that factor.
        </p>
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

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2">
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
      </div>
    </div>
  );
}
