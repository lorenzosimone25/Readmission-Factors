import { HelpCircle, X } from 'lucide-react';

import { ClinicalFieldModeToggle } from '@/features/readmission/components/ClinicalFieldModeToggle';
import {
  humanizeCaseSetupError,
  parseCommaSeparatedEntries,
  removeCommaSeparatedEntry,
} from '@/features/readmission/lib/caseClinicalSummary';

type InputMode = 'list' | 'uncertain';

const INPUT_MODE_OPTIONS = [
  { id: 'list' as const, label: 'Enter list' },
  { id: 'uncertain' as const, label: 'Uncertain' },
];

type Props = {
  id: string;
  label: string;
  value: string;
  uncertain: boolean;
  placeholder: string;
  errorMessage?: string;
  onValueChange: (value: string) => void;
  onUncertainChange: (uncertain: boolean) => void;
};

const fieldClass =
  'w-full resize-y rounded-lg border px-2.5 py-2 text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

export function ClinicalCommaField({
  id,
  label,
  value,
  uncertain,
  placeholder,
  errorMessage,
  onValueChange,
  onUncertainChange,
}: Props) {
  const mode: InputMode = uncertain ? 'uncertain' : 'list';
  const entries = mode === 'list' ? parseCommaSeparatedEntries(value) : [];
  const showError = Boolean(errorMessage);

  return (
    <div
      className="space-y-2 rounded-lg border p-2.5"
      data-no-card-select
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-panel-solid)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <label
            htmlFor={mode === 'list' ? id : undefined}
            className="text-[11px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {label}{' '}
            <span style={{ color: 'var(--color-accent-danger)' }} aria-hidden>
              *
            </span>
          </label>
          {mode === 'list' ? (
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              Comma-separated entries
            </p>
          ) : null}
        </div>
        <ClinicalFieldModeToggle
          value={mode}
          options={INPUT_MODE_OPTIONS}
          ariaLabel={`${label} input mode`}
          onChange={(next) => onUncertainChange(next === 'uncertain')}
        />
      </div>

      {mode === 'list' ? (
        <>
          <textarea
            id={id}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
            rows={2}
            className={fieldClass}
            style={{
              minHeight: '3.5rem',
              borderColor: 'var(--color-border-strong)',
              background: 'var(--color-panel-solid)',
              color: 'var(--color-text-primary)',
              // @ts-expect-error -- CSS custom property for tailwind ring tokens
              '--tw-ring-color': 'var(--color-accent-blue)',
              '--tw-ring-offset-color': 'var(--color-panel-solid)',
            }}
            autoComplete="off"
          />

          {entries.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {entries.map((entry, index) => (
                <span
                  key={`${entry}-${index}`}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-md border px-2 py-0.5 text-[11px]"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    background: 'var(--color-panel-alt)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span className="truncate">{entry}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${entry}`}
                    onClick={() => onValueChange(removeCommaSeparatedEntry(value, index))}
                    className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="flex items-start gap-2 rounded-lg border px-2.5 py-2.5"
          style={{
            borderColor: 'var(--color-border-strong)',
            background: 'var(--color-panel-alt)',
          }}
        >
          <HelpCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-hidden
          />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Marked as uncertain. Switch to &ldquo;Enter list&rdquo; to type specific values.
          </p>
        </div>
      )}

      {showError && errorMessage ? (
        <p className="text-[10px]" style={{ color: 'var(--color-accent-danger)' }}>
          {humanizeCaseSetupError(errorMessage)}
        </p>
      ) : null}
    </div>
  );
}
