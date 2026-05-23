import { AnnotationToast } from '@/features/readmission/components/AnnotationToast';
import { CaseReviewBar } from '@/features/readmission/components/CaseReviewBar';
import { DualNoteWorkspace } from '@/features/readmission/components/DualNoteWorkspace';
import { FactorWorkbenchPanel } from '@/features/readmission/components/FactorWorkbenchPanel';
import { SubmitReadinessPanel } from '@/features/readmission/components/SubmitReadinessPanel';
import { useReadmissionAnnotation } from '@/features/readmission/hooks/useReadmissionAnnotation';
import { useReadmissionSession } from '@/features/readmission/context/ReadmissionSessionContext';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  activeCase: ReadmissionCase;
  queueRowIds: string[];
  onNavigateCase: (rowId: string) => void;
  onQueueRefresh?: () => void;
  onBackToQueue?: () => void;
  onSubmitSuccess?: () => void;
};

export function ReadmissionTab({
  activeCase,
  queueRowIds,
  onNavigateCase,
  onQueueRefresh,
  onBackToQueue,
  onSubmitSuccess,
}: Props) {
  const ws = useReadmissionAnnotation({
    activeCase,
    queueRowIds,
    onNavigateCase,
    onQueueRefresh,
    onSubmitSuccess,
  });
  const session = useReadmissionSession();

  if (ws.loading || !ws.annotation || !ws.indexNote || !ws.readmissionNote) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        Preparing annotation workspace…
      </div>
    );
  }

  const submitBlocker =
    ws.submitValidation.errors[0] ?? 'Complete required factors before submitting.';

  const handleBackToQueue = () => {
    if (!onBackToQueue) return;
    if (session) {
      session.requestLeave(onBackToQueue);
    } else {
      onBackToQueue();
    }
  };

  return (
    <div data-theme="light" className="flex h-[calc(100svh-96px)] min-h-[640px] flex-col gap-3 overflow-hidden">
      <CaseReviewBar
        activeCase={ws.activeCase!}
        annotation={ws.annotation}
        caseIndex={ws.caseIndex}
        caseCount={ws.caseCount}
        dirty={ws.dirty}
        canSubmit={ws.submitValidation.ok}
        submitBlocker={submitBlocker}
        saveStatus={ws.saveStatus}
        lastSavedAt={ws.lastSavedAt}
        saveError={ws.saveError}
        submitting={ws.submitting}
        onPrev={ws.goPrevCase}
        onNext={ws.goNextCase}
        onSaveDraft={ws.saveDraft}
        onSubmit={() => void ws.submitReview()}
        onExport={ws.exportJson}
        onBackToQueue={onBackToQueue ? handleBackToQueue : undefined}
      />

      <SubmitReadinessPanel
        validation={ws.submitValidation}
        submitted={ws.annotation.status === 'submitted'}
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
              rawNote: ws.indexNote.rawNote,
              segments: ws.indexNote.segments,
            }}
            readmissionNote={{
              noteType: 'readmission',
              title: 'Readmission discharge summary',
              rawNote: ws.readmissionNote.rawNote,
              segments: ws.readmissionNote.segments,
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
            onHighlightClick={ws.deleteFactorFromNote}
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
            onUpdateFactorFormDraft={ws.updateFactorFormDraft}
            onJumpToSpan={ws.scrollToSpan}
            onRemoveHighlight={ws.removeHighlight}
          />
        </div>
      </div>

      <AnnotationToast toast={ws.toast} onDismiss={ws.dismissToast} />
    </div>
  );
}