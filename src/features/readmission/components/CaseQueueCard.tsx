import { memo } from 'react';
import { BookOpenText  , FilePenLine } from 'lucide-react';

import { DaysToReadmitBar } from '@/features/readmission/components/DaysToReadmitBar';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';

type Props = {
  item: CaseQueueItem;
  onReview: (rowId: string) => void;
  reviewDisabled?: boolean;
  reviewDisabledTitle?: string;
};

type QueueCtaVariant = 'start' | 'submitted';

function queueCtaStyle(variant: QueueCtaVariant): {
  background: string;
  boxShadow: string;
} {
  if (variant === 'start') {
    return {
      background: 'linear-gradient(135deg, hsl(214, 84%, 48%) 0%, hsl(224, 76%, 40%) 100%)',
      boxShadow: '0 2px 8px hsla(214, 70%, 40%, 0.35)',
    };
  }
  return {
    background: 'linear-gradient(135deg, hsl(38, 92%, 52%) 0%, hsl(28, 88%, 46%) 100%)',
    boxShadow: '0 2px 8px hsla(32, 75%, 42%, 0.35)',
  };
}

const queueCtaClass =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

function CaseQueueCardInner({ item, onReview, reviewDisabled = false, reviewDisabledTitle }: Props) {
  const isDone = item.annotationStatus === 'submitted';
  const ctaVariant: QueueCtaVariant = isDone ? 'submitted' : 'start';
  const ctaVisual = queueCtaStyle(ctaVariant);

  return (
    <article
      className="flex min-h-[200px] flex-col rounded-xl border p-4 transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-solid)' }}
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
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: isDone ? 'hsla(145, 50%, 62%, 0.2)' : 'hsla(0, 70%, 50%, 0.12)',
              color: isDone ? 'hsl(145, 45%, 30%)' : 'var(--color-accent-danger)',
            }}
          >
            {isDone ? 'Done' : 'To Do'}
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
        className="mt-4 flex items-center justify-end gap-2 border-t pt-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          disabled={reviewDisabled}
          title={
            reviewDisabled
              ? reviewDisabledTitle
              : isDone
                ? 'Open submitted annotation to review or edit'
                : 'Begin annotating this case'
          }
          onClick={() => onReview(item.rowId)}
          className={queueCtaClass}
          style={ctaVisual}
        >
          {isDone ? (
            <>
              Reopen Case <FilePenLine className="h-4 w-4" aria-hidden />
            </>
          ) : (
            <>
              Start reviewing
              <BookOpenText  className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export const CaseQueueCard = memo(CaseQueueCardInner);
