import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import {
  filterQueueItems,
  sortQueueItems,
  type CaseQueueItem,
  type QueueFilter,
} from '@/features/readmission/lib/taskEstimate';

type SortKey = 'days_asc' | 'days_desc' | 'tasks_desc';

type ReadmissionQueueContextValue = {
  items: CaseQueueItem[];
  filteredItems: CaseQueueItem[];
  queueRowIds: string[];
  loading: boolean;
  error: string | null;
  filter: QueueFilter;
  setFilter: (f: QueueFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  refresh: () => Promise<void>;
  openCase: (rowId: string) => void;
  remainingCaseCount: number;
  totalEstimatedTasks: number;
};

const ReadmissionQueueContext = createContext<ReadmissionQueueContextValue | null>(null);

export function ReadmissionQueueProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CaseQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('remaining');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('tasks_desc');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await readmissionApi.listCaseSummaries();
      setItems(summaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case queue.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredItems = useMemo(
    () => sortQueueItems(filterQueueItems(items, filter, search), sort),
    [items, filter, search, sort],
  );

  const queueRowIds = useMemo(
    () => filteredItems.map((i) => i.rowId),
    [filteredItems],
  );

  const remainingCaseCount = useMemo(
    () => items.filter((i) => i.annotationStatus !== 'submitted').length,
    [items],
  );

  const totalEstimatedTasks = useMemo(
    () => items.reduce((sum, i) => sum + i.estimatedTasks, 0),
    [items],
  );

  const openCase = useCallback(
    (rowId: string) => {
      navigate(`/research?case=${encodeURIComponent(rowId)}`);
    },
    [navigate],
  );

  const value: ReadmissionQueueContextValue = {
    items,
    filteredItems,
    queueRowIds,
    loading,
    error,
    filter,
    setFilter,
    search,
    setSearch,
    sort,
    setSort,
    refresh,
    openCase,
    remainingCaseCount,
    totalEstimatedTasks,
  };

  return (
    <ReadmissionQueueContext.Provider value={value}>{children}</ReadmissionQueueContext.Provider>
  );
}

export function useReadmissionQueue(): ReadmissionQueueContextValue {
  const ctx = useContext(ReadmissionQueueContext);
  if (!ctx) {
    throw new Error('useReadmissionQueue must be used within ReadmissionQueueProvider');
  }
  return ctx;
}
