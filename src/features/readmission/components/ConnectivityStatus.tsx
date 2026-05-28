import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';

import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApi';
import { useSync } from '@/features/readmission/offline/SyncProvider';

export function ConnectivityStatus() {
  const sync = useSync();
  if (!hasReadmissionBackend() || !sync) return null;

  const { online, pendingCount, syncing, lastSyncError, syncNow } = sync;

  return (
    <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
      {online ? (
        <Cloud className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CloudOff className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-warning)' }} aria-hidden />
      )}
      <span>{online ? 'Online' : 'Offline'}</span>
      {pendingCount > 0 ? (
        <span style={{ color: 'var(--color-accent-warning)' }}>
          · {pendingCount} pending sync
        </span>
      ) : null}
      {syncing ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : online && pendingCount > 0 ? (
        <button
          type="button"
          onClick={() => void syncNow()}
          className="inline-flex items-center gap-0.5 underline"
          style={{ color: 'var(--color-accent-blue)' }}
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Sync now
        </button>
      ) : null}
      {lastSyncError ? (
        <span title={lastSyncError} style={{ color: 'var(--color-accent-danger)' }}>
          · Sync error
        </span>
      ) : null}
    </div>
  );
}
