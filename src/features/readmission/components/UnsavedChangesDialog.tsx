type Props = {
  open: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesDialog({ open, saving, onSave, onDiscard, onCancel }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-lg"
        style={{
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-panel-solid)',
        }}
      >
        <h2
          id="unsaved-changes-title"
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Unsaved changes
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Save your draft before leaving, or discard changes and continue.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-accent-blue)' }}
          >
            {saving ? 'Saving…' : 'Save & leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
