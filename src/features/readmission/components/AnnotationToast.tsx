import { useEffect } from 'react';
import { X } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ToastMessage = {
  id: string;
  text: string;
  variant: ToastVariant;
  details?: string[];
};

type Props = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'var(--color-border-strong)',
  success: 'var(--color-accent-success)',
  warning: 'var(--color-accent-warning)',
  error: 'var(--color-accent-danger)',
};

export function AnnotationToast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border px-4 py-3 shadow-lg"
      style={{
        borderColor: VARIANT_BORDER[toast.variant],
        background: 'var(--color-panel-solid)',
        boxShadow: 'var(--shadow-panel)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {toast.text}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {toast.details && toast.details.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 text-xs" style={{ color: 'var(--color-accent-danger)' }}>
          {toast.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
