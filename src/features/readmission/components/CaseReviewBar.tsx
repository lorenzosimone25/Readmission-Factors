import { ChevronLeft, ChevronRight, Download, Save, Send } from 'lucide-react';

import type {
  AnnotationStatus,
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  activeCase: ReadmissionCase;
  annotation: ClinicianReadmissionAnnotation;
  caseIndex: number;
  caseCount: number;
  highlightCount: number;
  finalizedFactorCount: number;
  dirty: boolean;
  canSubmit: boolean;
  submitBlocker: string;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onExport: () => void;
};

function statusLabel(status: AnnotationStatus): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
  }
}

function statusColor(status: AnnotationStatus): string {
  switch (status) {
    case 'not_started':
      return 'var(--color-text-tertiary)';
    case 'draft':
      return 'var(--color-accent-warning)';
    case 'submitted':
      return 'var(--color-accent-success)';
  }
}

export function CaseReviewBar({
  activeCase,
  annotation,
  caseIndex,
  caseCount,
  highlightCount,
  finalizedFactorCount,
  dirty,
  canSubmit,
  submitBlocker,
  onPrev,
  onNext,
  onSaveDraft,
  onSubmit,
  onExport,
}: Props) {
  const submitDisabled = annotation.status === 'submitted' || !canSubmit;

  return (
    <header
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border px-3 py-2"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-solid)' }}
    >
      <div className="min-w-0">
        <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Readmission review
        </h1>
        {dirty ? (
          <p className="text-[10px] font-medium" style={{ color: 'var(--color-accent-warning)' }}>
            Unsaved changes
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--color-border)' }}>
          {activeCase.patientIdentifier}
        </span>
        <span>Subject {activeCase.subjectId}</span>
        <span>
          HADM {activeCase.indexHadmId} → {activeCase.readmitHadmId}
        </span>
        <span>ICD {activeCase.indexPrimaryIcdCode}</span>
        <span>{activeCase.daysToReadmission.toLocaleString()}d to readmit</span>
        {activeCase.readmitHasIcu ? <span>ICU</span> : null}
        <span>
          {highlightCount} hl · {finalizedFactorCount} done
        </span>
        <span className="font-semibold" style={{ color: statusColor(annotation.status) }}>
          {statusLabel(annotation.status)}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={caseIndex <= 0}
          onClick={onPrev}
          className="flex items-center gap-0.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          type="button"
          disabled={caseIndex < 0 || caseIndex >= caseCount - 1}
          onClick={onNext}
          className="flex items-center gap-0.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-alt)' }}
        >
          <Save className="h-3.5 w-3.5" />
          Save draft
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          title={submitDisabled ? submitBlocker : undefined}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          <Send className="h-3.5 w-3.5" />
          Submit
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </header>
  );
}
