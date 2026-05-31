import { memo } from 'react';
import { ArrowRight, FilePenLine } from 'lucide-react';

import { DaysToReadmitBar } from '@/features/readmission/components/DaysToReadmitBar';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import { queueStatusDisplay } from '@/features/readmission/lib/queueStatusDisplay';

type Props = {
  item: CaseQueueItem;
  onReview: (rowId: string) => void;
  reviewDisabled?: boolean;
  reviewDisabledTitle?: string;
};

type QueueCtaVariant = 'start' | 'continue' | 'submitted';

function queueCtaStyle(variant: QueueCtaVariant): {
  background: string;
  boxShadow: string;
} {
  if (variant === 'submitted') {
    return {
      background: 'linear-gradient(135deg, hsl(38, 92%, 52%) 0%, hsl(28, 88%, 46%) 100%)',
      boxShadow: '0 2px 8px hsla(32, 75%, 42%, 0.35)',
    };
  }
  if (variant === 'continue') {
    return {
      background: 'linear-gradient(135deg, hsl(214, 84%, 48%) 0%, hsl(224, 76%, 40%) 100%)',
      boxShadow: '0 2px 8px hsla(214, 70%, 40%, 0.35)',
    };
  }
  return {
    background: 'linear-gradient(135deg, hsl(214, 84%, 48%) 0%, hsl(224, 76%, 40%) 100%)',
    boxShadow: '0 2px 8px hsla(214, 70%, 40%, 0.35)',
  };
}

const queueCtaClass =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

function CaseQueueCardInner({ item, onReview, reviewDisabled = false, reviewDisabledTitle }: Props) {
  const status = queueStatusDisplay(item.annotationStatus);
  const StatusIcon = status.Icon;
  const isSubmitted = item.annotationStatus === 'submitted';
  const isDraft = item.annotationStatus === 'draft';

  const ctaVariant: QueueCtaVariant = isSubmitted ? 'submitted' : isDraft ? 'continue' : 'start';
  const ctaVisual = queueCtaStyle(ctaVariant);

  const ctaLabel = isSubmitted ? 'Reopen Case' : isDraft ? 'Start reviewing' : 'Start reviewing';
  const ctaTitle = isSubmitted
    ? 'Open submitted annotation to review or edit'
    : isDraft
      ? 'Resume in-progress annotation'
      : 'Begin annotating this case';

  return (
    <article
      className="flex min-h-[200px] flex-col rounded-xl border p-4 transition-shadow hover:shadow-md"
      style={{
        borderColor: 'var(--color-border-strong)',
        background: 'var(--color-panel-solid)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Case {item.rowId}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Subject {item.subjectId}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.pendingSync ? (
            <span
              className="h-2 w-2 rounded-full"
              title="Pending sync"
              style={{ background: 'var(--color-accent-warning)' }}
              aria-label="Pending sync"
            />
          ) : null}
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: status.badgeBackground,
              color: status.badgeColor,
              borderColor: status.badgeBorder,
            }}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {status.label}
          </span>
        </div>
      </div>

      <dl
        className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Subject ID
          </dt>
          <dd className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {item.subjectId}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Index HADM
          </dt>
          <dd>{item.indexHadmId}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Readmit HADM
          </dt>
          <dd>{item.readmitHadmId}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Days to readmit
          </dt>
          <dd className="mt-1">
            <DaysToReadmitBar days={item.daysToReadmission} />
          </dd>
        </div>
      </dl>

      <div
        className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mr-auto flex flex-col gap-0.5">
          {item.estimatedReadingMinutes ? (
            <span
              className="text-[10px] tabular-nums"
              style={{ color: 'var(--color-text-tertiary)' }}
              title="Estimated time to read both discharge summaries"
            >
              ~{item.estimatedReadingMinutes} min read
            </span>
          ) : null}
          {isDraft && item.estimatedTasks > 0 ? (
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {item.estimatedTasks} task{item.estimatedTasks !== 1 ? 's' : ''} left
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={reviewDisabled}
          title={reviewDisabled ? reviewDisabledTitle : ctaTitle}
          onClick={() => onReview(item.rowId)}
          className={queueCtaClass}
          style={ctaVisual}
        >
          {isSubmitted ? (
            <>
              {ctaLabel} <FilePenLine className="h-4 w-4" aria-hidden />
            </>
          ) : (
            <>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export const CaseQueueCard = memo(CaseQueueCardInner);
