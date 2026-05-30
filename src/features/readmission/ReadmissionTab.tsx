import { AnnotationToast } from '@/features/readmission/components/AnnotationToast';
import { CaseReviewBar } from '@/features/readmission/components/CaseReviewBar';
import { DualNoteWorkspace } from '@/features/readmission/components/DualNoteWorkspace';
import { FactorWorkbenchPanel } from '@/features/readmission/components/FactorWorkbenchPanel';
import { HighlightSpanPopover } from '@/features/readmission/components/HighlightSpanPopover';
import { SubmitReadinessPanel } from '@/features/readmission/components/SubmitReadinessPanel';
import { useReadmissionAnnotation } from '@/features/readmission/hooks/useReadmissionAnnotation';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  activeCase: ReadmissionCase;
  queueRowIds: string[];
  onNavigateCase: (rowId: string) => void;
  onQueueRefresh?: () => void;
  onSubmitSuccess?: () => void;
};

export function ReadmissionTab({
  activeCase,
  queueRowIds,
  onNavigateCase,
  onQueueRefresh,
  onSubmitSuccess,
}: Props) {
  const ws = useReadmissionAnnotation({
    activeCase,
    queueRowIds,
    onNavigateCase,
    onQueueRefresh,
    onSubmitSuccess,
  });
  if (ws.loading || !ws.annotation || !ws.indexNote || !ws.readmissionNote) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        Preparing annotation workspace…
      </div>
    );
  }

  const submitBlocker =
    ws.submitValidation.errors[0] ?? 'Complete required factors before submitting.';

  const cohortHashMismatch =
    activeCase.noteVersionHash !== ws.annotation.noteVersionHash;

  return (
    <div data-theme="light" className="flex h-[calc(100svh-96px)] min-h-[640px] flex-col gap-3 overflow-hidden">
      <CaseReviewBar
        activeCase={ws.activeCase!}
        annotation={ws.annotation}
        dirty={ws.dirty}
        canSubmit={ws.submitValidation.ok}
        submitBlocker={submitBlocker}
        saveStatus={ws.saveStatus}
        lastSavedAt={ws.lastSavedAt}
        saveError={ws.saveError}
        submitting={ws.submitting}
        wasEverSubmitted={ws.wasEverSubmitted}
        onSaveDraft={ws.saveDraft}
        onSubmit={() => void ws.submitReview()}
        onExport={ws.exportJson}
      />

      {cohortHashMismatch ? (
        <p
          className="shrink-0 rounded-lg border px-3 py-2 text-[11px]"
          style={{
            borderColor: 'var(--color-accent-warning)',
            background: 'hsla(40, 90%, 50%, 0.1)',
            color: 'var(--color-accent-warning)',
          }}
        >
          Case notes were updated on the server (version mismatch). Refresh your browser after
          reconnecting so cases can re-download.
        </p>
      ) : null}

      {ws.wasEverSubmitted ? (
        <p
          className="shrink-0 rounded-lg border px-3 py-2 text-[11px]"
          style={{
            borderColor: 'var(--color-border)',
            background: 'hsla(210, 80%, 50%, 0.08)',
            color: 'var(--color-text-secondary)',
          }}
        >
          This case was submitted. Edits reopen as a draft — save, then resubmit when ready.
        </p>
      ) : null}

      <SubmitReadinessPanel
        validation={ws.submitValidation}
        submitted={ws.annotation.status === 'submitted' && !ws.dirty}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-3">
        <div
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-solid)' }}
        >
          <DualNoteWorkspace
            indexNote={{
              noteType: 'index_hf',
              title: 'Index discharge summary',
              canonicalNote: ws.indexNote.canonicalNote,
              sectionMetaAtChar: ws.indexNote.sectionMetaAtChar,
              segments: ws.indexNote.segments,
              storedSections: ws.indexNote.storedSections,
            }}
            readmissionNote={{
              noteType: 'readmission',
              title: 'Readmission discharge summary',
              canonicalNote: ws.readmissionNote.canonicalNote,
              sectionMetaAtChar: ws.readmissionNote.sectionMetaAtChar,
              segments: ws.readmissionNote.segments,
              storedSections: ws.readmissionNote.storedSections,
            }}
            groups={ws.annotation.evidenceGroups}
            groupById={ws.groupById}
            factorById={ws.factorById}
            spansByGroupId={ws.spansByGroupId}
            pendingSelection={ws.pendingSelection}
            setPendingSelectionSafe={ws.setPendingSelectionSafe}
            clearPendingSelection={ws.clearPendingSelection}
            activeGroup={ws.activeGroup}
            activeGroupId={ws.activeGroupId}
            indexScrollRef={ws.indexScrollRef}
            readmissionScrollRef={ws.readmissionScrollRef}
            onSelectGroup={ws.selectGroup}
            onAddFactor={() => ws.addEvidenceGroup()}
            onHighlightClick={ws.openHighlightPopover}
            onAddHighlight={ws.addHighlightToActiveGroup}
          />
        </div>

        <div
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-solid)' }}
        >
          <header
            className="shrink-0 border-b px-3 py-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
          >
            <h3 className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Readmission factors
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {ws.annotation.evidenceGroups.length} factor
              {ws.annotation.evidenceGroups.length !== 1 ? 's' : ''} · {ws.highlightCount} highlight
              {ws.highlightCount !== 1 ? 's' : ''}
            </p>
          </header>
          <FactorWorkbenchPanel
            annotation={ws.annotation}
            spansByGroupId={ws.spansByGroupId}
            factorById={ws.factorById}
            expandedGroupId={ws.expandedGroupId}
            activeGroupId={ws.activeGroupId}
            groupCardRefs={ws.groupCardRefs}
            isDefaultFactorLabel={ws.isDefaultFactorLabel}
            getFactorFormDraft={ws.getFactorFormDraft}
            onSelectGroup={ws.selectGroup}
            onToggleExpand={ws.toggleGroupExpand}
            onRenameGroup={ws.renameGroup}
            onAddFactor={ws.addEvidenceGroup}
            onDeleteFactor={ws.removeEvidenceGroup}
            onSaveFactor={ws.saveFactor}
            onUpdateGroupNote={ws.updateGroupNote}
            onJumpToSpan={ws.scrollToSpan}
            onRemoveHighlight={ws.removeHighlight}
          />
        </div>
      </div>

      <HighlightSpanPopover
        anchor={ws.spanPopover}
        onRemoveHighlight={ws.removeHighlight}
        onDismiss={ws.closeHighlightPopover}
      />

      <AnnotationToast toast={ws.toast} onDismiss={ws.dismissToast} />
    </div>
  );
}