import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { accentForGroupColor } from '@/features/readmission/lib/groupColors';
import type { SubmissionReviewSummary } from '@/features/readmission/lib/buildSubmissionReviewSummary';

type Props = {
  open: boolean;
  summary: SubmissionReviewSummary | null;
  canSubmit: boolean;
  submitting: boolean;
  saving: boolean;
  wasEverSubmitted?: boolean;
  onConfirm: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
};

export function SubmitReviewDialog({
  open,
  summary,
  canSubmit,
  submitting,
  saving,
  wasEverSubmitted = false,
  onConfirm,
  onSaveDraft,
  onClose,
}: Props) {
  const backButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !summary) return null;

  const confirmLabel = wasEverSubmitted ? 'Confirm and resubmit' : 'Confirm and submit';
  const busy = submitting || saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-lg"
        style={{
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-panel-solid)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="shrink-0 border-b px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2
            id="submit-review-title"
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Review before submit
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Confirm your case setup and readmission factors.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <section aria-label="Case setup">
            <h3
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Case setup
            </h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  Diagnoses
                </dt>
                <dd style={{ color: 'var(--color-text-primary)' }}>{summary.caseSetup.diagnoses}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  Symptoms
                </dt>
                <dd style={{ color: 'var(--color-text-primary)' }}>{summary.caseSetup.symptoms}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  Overall confidence
                </dt>
                <dd style={{ color: 'var(--color-text-primary)' }}>
                  {summary.caseSetup.overallConfidence
                    ? `${summary.caseSetup.overallConfidence} — ${summary.caseSetup.overallConfidenceLabel}`
                    : summary.caseSetup.overallConfidenceLabel}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-4" aria-label="Readmission factors">
            <h3
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Readmission factors ({summary.factors.length})
            </h3>
            <div className="mt-2 space-y-2">
              {summary.factors.map((factor) => (
                <article
                  key={factor.id}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    background: 'var(--color-panel-alt)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    {factor.groupColor ? (
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: accentForGroupColor(factor.groupColor) }}
                        aria-hidden
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {factor.label}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {factor.roleLabel} · {factor.confidence} — {factor.confidenceLabel}
                      </p>
                      {factor.evidencePreviews.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5">
                          {factor.evidencePreviews.map((preview, index) => (
                            <li
                              key={`${factor.id}-ev-${index}`}
                              className="text-[11px] italic"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              &ldquo;{preview}&rdquo;
                            </li>
                          ))}
                          {factor.evidenceOverflowCount > 0 ? (
                            <li className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                              +{factor.evidenceOverflowCount} more highlight
                              {factor.evidenceOverflowCount === 1 ? '' : 's'}
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                          No highlights
                        </p>
                      )}
                      {factor.note ? (
                        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                          Note: {factor.note.length > 120 ? `${factor.note.slice(0, 120)}…` : factor.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-4 py-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-solid)' }}
        >
          <button
            ref={backButtonRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Go back to editing
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={busy}
            className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)' }}
          >
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-accent-blue)' }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Submitting…' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
