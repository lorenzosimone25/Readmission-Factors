import { Loader2 } from 'lucide-react';

import { useSync } from '@/features/readmission/offline/SyncProvider';

export function BootstrapProgressBanner() {
  const sync = useSync();
  if (!sync?.bootstrapping || !sync.bootstrapProgress) return null;

  const { done, total, phase } = sync.bootstrapProgress;
  const label =
    phase === 'assignments'
      ? 'Loading your assignment list…'
      : `Downloading cases (${done}/${total})…`;

  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
      style={{
        borderColor: 'var(--color-border-strong)',
        background: 'hsla(210, 80%, 50%, 0.08)',
        color: 'var(--color-text-secondary)',
      }}
      role="status"
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
