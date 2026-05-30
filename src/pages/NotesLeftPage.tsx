import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { BootstrapProgressBanner } from '@/features/readmission/components/BootstrapProgressBanner';
import { CaseQueueCard } from '@/features/readmission/components/CaseQueueCard';
import { NotesLeftToolbar } from '@/features/readmission/components/NotesLeftToolbar';
import { useReadmissionQueue } from '@/features/readmission/context/ReadmissionQueueContext';
import { useSync } from '@/features/readmission/offline/SyncProvider';
import type { QueueFilter } from '@/features/readmission/lib/taskEstimate';

const PAGE_SIZE = 6;

const VALID_FILTERS: ReadonlySet<QueueFilter> = new Set([
  'all',
  'remaining',
  'draft',
  'submitted',
]);

function welcomeHeading(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return 'Welcome';
  if (/^prof\.?\s/i.test(trimmed)) return `Welcome, ${trimmed}`;
  return `Welcome, ${trimmed}`;
}

export function NotesLeftPage() {
  const auth = useAuth();
  const queue = useReadmissionQueue();
  const sync = useSync();
  const [page, setPage] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedUrlFilterRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const heading = useMemo(
    () => welcomeHeading(auth.user?.displayName ?? ''),
    [auth.user?.displayName],
  );

  useEffect(() => {
    const f = searchParams.get('filter');
    if (!f) {
      appliedUrlFilterRef.current = null;
      return;
    }
    if (appliedUrlFilterRef.current === f) return;
    const resolved = f === 'not_started' ? 'remaining' : (f as QueueFilter);
    if (VALID_FILTERS.has(resolved)) {
      appliedUrlFilterRef.current = f;
      queue.setFilter(resolved);
      setPage(0);
    }
  }, [searchParams, queue]);

  const totalPages = Math.max(1, Math.ceil(queue.filteredItems.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return queue.filteredItems.slice(start, start + PAGE_SIZE);
  }, [page, queue.filteredItems]);

  const handleFilterChange = (f: QueueFilter) => {
    const next = new URLSearchParams(searchParams);
    if (f === 'remaining') {
      next.delete('filter');
    } else {
      next.set('filter', f);
    }
    appliedUrlFilterRef.current = f === 'remaining' ? null : f;
    setSearchParams(next, { replace: true });
    startTransition(() => {
      queue.setFilter(f);
      setPage(0);
    });
  };

  const handleSearchChange = (s: string) => {
    startTransition(() => {
      queue.setSearch(s);
      setPage(0);
    });
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
      <BootstrapProgressBanner />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {heading}
          </h1>
          <p
            className="mt-1 flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {queue.remainingCaseCount.toLocaleString()} patients left to annotate
            <Loader2
              className="h-3.5 w-3.5 animate-spin transition-opacity duration-150"
              style={{
                opacity: isPending ? 0.85 : 0,
                color: 'var(--color-text-tertiary)',
              }}
              aria-hidden={!isPending}
            />
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
          className="rounded-xl border px-4 py-12 text-center text-sm transition-opacity duration-150"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-tertiary)',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          No cases match this filter.
        </p>
      ) : (
        <div
          className="grid auto-rows-min grid-cols-1 items-start gap-3 transition-opacity duration-150 md:grid-cols-2 xl:grid-cols-3"
          style={{
            opacity: isPending ? 0.55 : 1,
            pointerEvents: isPending ? 'none' : undefined,
          }}
          aria-busy={isPending}
        >
          {pageItems.map((item) => (
            <CaseQueueCard
              key={item.rowId}
              item={item}
              onReview={queue.openCase}
              reviewDisabled={sync?.bootstrapping ?? false}
              reviewDisabledTitle="Case notes are still downloading…"
            />
          ))}
        </div>
      )}

      {queue.filteredItems.length > 0 ? (
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
