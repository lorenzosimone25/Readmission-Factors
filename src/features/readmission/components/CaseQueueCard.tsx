import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';

type Props = {
  item: CaseQueueItem;
  onReview: (rowId: string) => void;
};

function statusLabel(status: CaseQueueItem['annotationStatus']): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'draft':
      return 'In progress';
    case 'submitted':
      return 'Submitted';
  }
}

function tasksLabel(tasks: number): string {
  if (tasks === 0) return 'Ready';
  return tasks === 1 ? '1 task left' : `${tasks.toLocaleString()} tasks left`;
}

export function CaseQueueCard({ item, onReview }: Props) {
  const isDone = item.annotationStatus === 'submitted';

  return (
    <article
      className="flex flex-col rounded-xl border p-4 transition-shadow hover:shadow-md"
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
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: isDone ? 'hsla(145, 50%, 62%, 0.2)' : 'hsla(0, 70%, 50%, 0.1)',
            color: isDone ? 'hsl(145, 45%, 35%)' : 'var(--color-accent-danger)',
          }}
        >
          {isDone ? 'Done' : tasksLabel(item.estimatedTasks)}
        </span>
      </div>

      <dl
        className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Patient
          </dt>
          <dd className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {item.patientIdentifier}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Subject ID
          </dt>
          <dd>{item.subjectId}</dd>
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
            Index ICD
          </dt>
          <dd>{item.indexPrimaryIcdCode}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
            Days to readmit
          </dt>
          <dd>{item.daysToReadmission.toLocaleString()}</dd>
        </div>
      </dl>

      <div
        className="mt-4 flex items-center justify-between gap-2 border-t pt-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {statusLabel(item.annotationStatus)}
        </span>
        <button
          type="button"
          onClick={() => onReview(item.rowId)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          Review
        </button>
      </div>
    </article>
  );
}
