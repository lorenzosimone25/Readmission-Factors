import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { CaseQueueCard } from '@/features/readmission/components/CaseQueueCard';
import { NotesLeftToolbar } from '@/features/readmission/components/NotesLeftToolbar';
import { useReadmissionQueue } from '@/features/readmission/context/ReadmissionQueueContext';
import type { QueueFilter } from '@/features/readmission/lib/taskEstimate';

const PAGE_SIZE = 24;

const VALID_FILTERS: ReadonlySet<QueueFilter> = new Set([
  'all',
  'remaining',
  'not_started',
  'draft',
  'submitted',
]);

export function NotesLeftPage() {
  const queue = useReadmissionQueue();
  const [page, setPage] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedUrlFilterRef = useRef<string | null>(null);
  const refreshedOnMountRef = useRef(false);

  useEffect(() => {
    if (refreshedOnMountRef.current) return;
    refreshedOnMountRef.current = true;
    void queue.refresh();
  }, [queue]);

  useEffect(() => {
    const f = searchParams.get('filter');
    if (!f) {
      appliedUrlFilterRef.current = null;
      return;
    }
    if (appliedUrlFilterRef.current === f) return;
    if (VALID_FILTERS.has(f as QueueFilter)) {
      appliedUrlFilterRef.current = f;
      queue.setFilter(f as QueueFilter);
      setPage(0);
    }
  }, [searchParams, queue]);

  const totalPages = Math.max(1, Math.ceil(queue.filteredItems.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return queue.filteredItems.slice(start, start + PAGE_SIZE);
  }, [page, queue.filteredItems]);

  const handleFilterChange = (f: QueueFilter) => {
    queue.setFilter(f);
    setPage(0);
    const next = new URLSearchParams(searchParams);
    if (f === 'remaining') {
      next.delete('filter');
    } else {
      next.set('filter', f);
    }
    appliedUrlFilterRef.current = f === 'remaining' ? null : f;
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (s: string) => {
    queue.setSearch(s);
    setPage(0);
  };

  const handleRefresh = () => {
    void queue.refresh();
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
      <div className="flex flex-col gap-3">
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: 'var(--color-accent-danger)', color: 'var(--color-accent-danger)' }}
        >
          {queue.error}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="self-start rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-theme="light" className="flex min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Notes left
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {queue.remainingCaseCount.toLocaleString()} cases remaining ·{' '}
            {queue.totalEstimatedTasks.toLocaleString()} estimated tasks
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
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
