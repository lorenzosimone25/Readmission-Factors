import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  Loader2,
  Save,
  Send,
} from 'lucide-react';

import type {
  AnnotationStatus,
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';
import type { SaveStatus } from '@/features/readmission/hooks/useReadmissionAnnotation';

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
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;
  submitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onExport: () => void;
  onBackToQueue?: () => void;
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

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function SaveIndicator({
  status,
  dirty,
  lastSavedAt,
  saveError,
  submitted,
  onRetry,
}: {
  status: SaveStatus;
  dirty: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  submitted: boolean;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  if (submitted) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: 'hsla(145, 40%, 45%, 0.45)',
          color: 'hsl(145, 45%, 30%)',
          background: 'hsla(145, 50%, 62%, 0.12)',
        }}
      >
        <Check className="h-3 w-3" />
        Submitted
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={saveError ?? 'Save failed'}
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: 'hsla(0, 70%, 50%, 0.45)',
          color: 'var(--color-accent-danger)',
          background: 'hsla(0, 70%, 50%, 0.08)',
        }}
      >
        <AlertTriangle className="h-3 w-3" />
        Save failed — retry
      </button>
    );
  }

  if (dirty) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: 'var(--color-accent-warning)', color: 'var(--color-accent-warning)' }}
      >
        Unsaved changes
      </span>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >
        <Check className="h-3 w-3" />
        Saved {formatRelative(lastSavedAt, now)}
      </span>
    );
  }

  return null;
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
  saveStatus,
  lastSavedAt,
  saveError,
  submitting,
  onPrev,
  onNext,
  onSaveDraft,
  onSubmit,
  onExport,
  onBackToQueue,
}: Props) {
  const isSubmitted = annotation.status === 'submitted';
  const submitDisabled = isSubmitted || !canSubmit || submitting;

  return (
    <header
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border px-3 py-2"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-solid)' }}
    >
      <div className="min-w-0">
        <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Readmission review
        </h1>
        <div className="mt-0.5">
          <SaveIndicator
            status={saveStatus}
            dirty={dirty}
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            submitted={isSubmitted}
            onRetry={onSaveDraft}
          />
        </div>
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
        {onBackToQueue ? (
          <button
            type="button"
            onClick={onBackToQueue}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Notes Left
          </button>
        ) : null}
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
          disabled={isSubmitted || saveStatus === 'saving'}
          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-alt)' }}
        >
          <Save className="h-3.5 w-3.5" />
          Save draft
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          title={submitDisabled ? (submitting ? 'Submitting…' : submitBlocker) : undefined}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {submitting ? 'Submitting…' : 'Submit'}
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
