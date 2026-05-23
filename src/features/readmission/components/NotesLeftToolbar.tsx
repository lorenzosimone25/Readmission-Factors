import { useEffect, useRef, useState } from 'react';

import type { QueueFilter } from '@/features/readmission/lib/taskEstimate';

type SortKey = 'days_asc' | 'days_desc' | 'tasks_desc';

type Props = {
  filter: QueueFilter;
  onFilterChange: (f: QueueFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
};

const SEARCH_DEBOUNCE_MS = 180;

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: 'remaining', label: 'Remaining' },
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not started' },
  { id: 'draft', label: 'In progress' },
  { id: 'submitted', label: 'Submitted' },
];

export function NotesLeftToolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: Props) {
  const [draftSearch, setDraftSearch] = useState(search);
  const lastCommittedRef = useRef(search);

  useEffect(() => {
    if (search !== lastCommittedRef.current) {
      setDraftSearch(search);
      lastCommittedRef.current = search;
    }
  }, [search]);

  useEffect(() => {
    if (draftSearch === lastCommittedRef.current) return;
    const id = window.setTimeout(() => {
      lastCommittedRef.current = draftSearch;
      onSearchChange(draftSearch);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draftSearch, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className="rounded-lg border px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: active ? 'var(--color-border-strong)' : 'var(--color-border)',
                background: active ? 'var(--color-panel-alt)' : 'transparent',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <input
        type="search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        placeholder="Search patient, subject, ICD…"
        className="min-w-[200px] flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-panel-solid)',
          color: 'var(--color-text-primary)',
        }}
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="rounded-lg border px-2 py-1.5 text-xs"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-panel-solid)',
          color: 'var(--color-text-primary)',
        }}
      >
        <option value="tasks_desc">Most tasks</option>
        <option value="days_asc">Days to readmit (low)</option>
        <option value="days_desc">Days to readmit (high)</option>
      </select>
    </div>
  );
}
