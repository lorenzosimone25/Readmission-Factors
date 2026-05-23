import { useMemo, useState } from 'react';

import { CaseQueueCard } from '@/features/readmission/components/CaseQueueCard';
import { NotesLeftToolbar } from '@/features/readmission/components/NotesLeftToolbar';
import { useReadmissionQueue } from '@/features/readmission/context/ReadmissionQueueContext';

const PAGE_SIZE = 24;

export function NotesLeftPage() {
  const queue = useReadmissionQueue();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(queue.filteredItems.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return queue.filteredItems.slice(start, start + PAGE_SIZE);
  }, [page, queue.filteredItems]);

  const handleFilterChange = (f: typeof queue.filter) => {
    queue.setFilter(f);
    setPage(0);
  };

  const handleSearchChange = (s: string) => {
    queue.setSearch(s);
    setPage(0);
  };

  if (queue.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        Loading cases from dataset…
      </div>
    );
  }

  if (queue.error) {
    return (
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: 'var(--color-accent-danger)', color: 'var(--color-accent-danger)' }}
      >
        {queue.error}
      </div>
    );
  }

  return (
    <div data-theme="light" className="flex min-h-0 flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Notes left
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {queue.remainingCaseCount.toLocaleString()} cases remaining ·{' '}
          {queue.totalEstimatedTasks.toLocaleString()} estimated tasks
        </p>
      </header>

      <NotesLeftToolbar
        filter={queue.filter}
        onFilterChange={handleFilterChange}
        search={queue.search}
        onSearchChange={handleSearchChange}
        sort={queue.sort}
        onSortChange={queue.setSort}
      />

      {pageItems.length === 0 ? (
        <p
          className="rounded-xl border px-4 py-12 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
        >
          No cases match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((item) => (
            <CaseQueueCard key={item.rowId} item={item} onReview={queue.openCase} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Page {page + 1} of {totalPages.toLocaleString()} · {queue.filteredItems.length.toLocaleString()} cases
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}