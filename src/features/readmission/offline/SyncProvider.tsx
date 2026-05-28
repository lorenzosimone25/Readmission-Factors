import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { needsBootstrap, runBootstrap } from '@/features/readmission/offline/BootstrapService';
import type { BootstrapProgress } from '@/features/readmission/offline/localTypes';
import { flushSyncOutbox, countPendingOps } from '@/features/readmission/offline/SyncEngine';
import { setupAnnotationCheckpointListeners } from '@/features/readmission/offline/annotationCheckpoint';

type SyncContextValue = {
  online: boolean;
  bootstrapping: boolean;
  bootstrapProgress: BootstrapProgress | null;
  pendingCount: number;
  syncing: boolean;
  lastSyncError: string | null;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({
  children,
  onBootstrapComplete,
}: {
  children: ReactNode;
  onBootstrapComplete?: () => void;
}) {
  const auth = useAuth();
  const backend = hasReadmissionBackend();
  const onBootstrapCompleteRef = useRef(onBootstrapComplete);
  onBootstrapCompleteRef.current = onBootstrapComplete;

  const [online, setOnline] = useState(() => navigator.onLine);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapProgress, setBootstrapProgress] = useState<BootstrapProgress | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    if (!backend) return;
    setPendingCount(await countPendingOps());
  }, [backend]);

  const syncNow = useCallback(async () => {
    if (!backend || !navigator.onLine) return;
    setSyncing(true);
    setLastSyncError(null);
    try {
      const result = await flushSyncOutbox();
      if (result.lastError) setLastSyncError(result.lastError);
      await refreshPendingCount();
      if (result.flushed > 0) onBootstrapCompleteRef.current?.();
    } finally {
      setSyncing(false);
    }
  }, [backend, refreshPendingCount]);

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  useEffect(() => {
    return setupAnnotationCheckpointListeners();
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!backend || auth.loading || !auth.user?.id) return;

    let cancelled = false;

    void (async () => {
      const userId = auth.user!.id;
      const shouldBootstrap = await needsBootstrap(userId);
      if (!shouldBootstrap || !navigator.onLine) {
        await refreshPendingCount();
        return;
      }

      setBootstrapping(true);
      try {
        await runBootstrap(userId, (p) => {
          if (!cancelled) setBootstrapProgress(p);
        });
        if (!cancelled) onBootstrapCompleteRef.current?.();
      } catch (e) {
        if (!cancelled) {
          setLastSyncError(e instanceof Error ? e.message : 'Bootstrap failed');
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
          setBootstrapProgress(null);
          await refreshPendingCount();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.user?.id, backend, refreshPendingCount]);

  useEffect(() => {
    if (!backend || auth.loading || !auth.user?.id || !online) return;
    void refreshPendingCount();
    void syncNowRef.current();
  }, [auth.loading, auth.user?.id, backend, online, refreshPendingCount]);

  useEffect(() => {
    if (!backend || !online) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNowRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [backend, online]);

  useEffect(() => {
    if (!backend) return;
    void refreshPendingCount();
    const id = window.setInterval(() => void refreshPendingCount(), 5000);
    return () => window.clearInterval(id);
  }, [backend, refreshPendingCount]);

  const value = useMemo<SyncContextValue>(
    () => ({
      online,
      bootstrapping,
      bootstrapProgress,
      pendingCount,
      syncing,
      lastSyncError,
      syncNow,
    }),
    [online, bootstrapping, bootstrapProgress, pendingCount, syncing, lastSyncError, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue | null {
  return useContext(SyncContext);
}
