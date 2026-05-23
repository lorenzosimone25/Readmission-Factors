import { memo } from 'react';

import { DaysToReadmitBar } from '@/features/readmission/components/DaysToReadmitBar';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';

type Props = {
  item: CaseQueueItem;
  onReview: (rowId: string) => void;
};

function CaseQueueCardInner({ item, onReview }: Props) {
  const isDone = item.annotationStatus === 'submitted';

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
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            background: isDone ? 'hsla(145, 50%, 62%, 0.2)' : 'hsla(0, 70%, 50%, 0.12)',
            color: isDone ? 'hsl(145, 45%, 30%)' : 'var(--color-accent-danger)',
          }}
        >
          {isDone ? 'Done' : 'To Do'}
        </span>
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
          onClick={() => onReview(item.rowId)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          Start Reviewing
        </button>
      </div>
    </article>
  );
}

export const CaseQueueCard = memo(CaseQueueCardInner);
