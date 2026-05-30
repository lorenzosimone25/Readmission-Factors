import { useEffect, useState, type RefObject } from 'react';
import { Sparkles } from 'lucide-react';

import { GroupColorBar } from '@/features/readmission/components/GroupColorBar';
import {
  NotePaneLayoutControls,
  NoteSplitLayout,
} from '@/features/readmission/components/NoteSplitLayout';
import { NoteViewer } from '@/features/readmission/components/NoteViewer';
import {
  loadMagicBetaEnabled,
  saveMagicBetaEnabled,
} from '@/features/readmission/lib/magicBeta';
import {
  loadNotePaneLayout,
  saveNotePaneLayout,
  type NotePaneLayout,
} from '@/features/readmission/lib/notePaneLayout';
import type { SectionMetaAtChar } from '@/features/readmission/lib/selectionToOffsets';
import type {
  ClinicalNoteType,
  EvidenceGroup,
  EvidenceSpan,
  HighlightClickPayload,
  NoteSegment,
  PendingSelection,
  ReadmissionFactor,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

type NotePaneProps = {
  noteType: ClinicalNoteType;
  title: string;
  canonicalNote: string;
  sectionMetaAtChar?: SectionMetaAtChar;
  segments: NoteSegment[];
  storedSections?: StoredNoteSection[];
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

const magicBetaBtnClass = 'rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-40';

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
  const [magicBetaEnabled, setMagicBetaEnabled] = useState(() => loadMagicBetaEnabled());
  const magicBetaAvailable = paneLayout.mode !== 'split';

  useEffect(() => {
    saveNotePaneLayout(paneLayout);
  }, [paneLayout]);

  useEffect(() => {
    saveMagicBetaEnabled(magicBetaEnabled);
  }, [magicBetaEnabled]);

  const selectionReady = Boolean(
    activeGroup && pendingSelection && !pendingSelection.mappingError,
  );

  const indexMagicBeta = magicBetaEnabled && paneLayout.mode === 'index';
  const readmissionMagicBeta = magicBetaEnabled && paneLayout.mode === 'readmission';

  const indexPane = (
    <NoteViewer
      noteType="index_hf"
      title={indexNote.title}
      canonicalNote={indexNote.canonicalNote}
      sectionMetaAtChar={indexNote.sectionMetaAtChar}
      segments={indexNote.segments}
      storedSections={indexNote.storedSections}
      magicBetaEnabled={indexMagicBeta}
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
      canonicalNote={readmissionNote.canonicalNote}
      sectionMetaAtChar={readmissionNote.sectionMetaAtChar}
      segments={readmissionNote.segments}
      storedSections={readmissionNote.storedSections}
      magicBetaEnabled={readmissionMagicBeta}
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

  const magicBetaActiveStyle = {
    borderColor: 'var(--color-border-strong)',
    background: 'var(--color-panel-solid)',
    color: 'var(--color-text-primary)',
  };
  const magicBetaIdleStyle = {
    borderColor: 'var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  };

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
          <div className="flex shrink-0 items-center gap-1">
            <NotePaneLayoutControls layout={paneLayout} onLayoutChange={setPaneLayout} />
            <button
              type="button"
              className={`${magicBetaBtnClass} inline-flex items-center gap-1`}
              style={magicBetaEnabled && magicBetaAvailable ? magicBetaActiveStyle : magicBetaIdleStyle}
              title={
                magicBetaAvailable
                  ? 'Magic Beta section reading view'
                  : 'Magic Beta is available in single-note view'
              }
              aria-label="Magic Beta section reading view"
              aria-pressed={magicBetaEnabled && magicBetaAvailable}
              disabled={!magicBetaAvailable}
              onClick={() => setMagicBetaEnabled((enabled) => !enabled)}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Beta
            </button>
          </div>
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
