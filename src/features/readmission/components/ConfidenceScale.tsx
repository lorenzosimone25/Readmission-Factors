import { CONFIDENCE_SCALE } from '@/features/readmission/lib/vocabLabels';
import type { FactorConfidence } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  value: FactorConfidence | null;
  onChange: (value: FactorConfidence) => void;
  label?: string;
  hint?: string;
};

export function ConfidenceScale({
  value,
  onChange,
  label = 'Confidence',
  hint = 'Select how confident you are in this factor (1 = very low, 5 = very high).',
}: Props) {
  const selectedShort = value
    ? CONFIDENCE_SCALE.find((o) => o.value === value)?.short
    : null;

  return (
    <div role="radiogroup" aria-label={`${label} level from 1 to 5`} data-no-card-select>
      <p
        className="text-[10px] font-medium uppercase tracking-wide"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {label} <span style={{ color: 'var(--color-accent-danger)' }}>*</span>
      </p>

      <div className="mt-1 flex flex-wrap gap-1.5">
        {CONFIDENCE_SCALE.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => onChange(opt.value)}
              className="flex aspect-square h-9 w-9 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                borderColor: selected
                  ? 'var(--color-accent-blue)'
                  : 'var(--color-border-strong)',
                background: selected ? 'var(--color-accent-blue)' : 'var(--color-panel-solid)',
                color: selected ? '#ffffff' : 'var(--color-text-primary)',
                boxShadow: selected ? '0 1px 3px hsla(0, 0%, 0%, 0.15)' : 'none',
                // @ts-expect-error -- CSS custom property for tailwind ring tokens
                '--tw-ring-color': 'var(--color-accent-blue)',
                '--tw-ring-offset-color': 'var(--color-panel-solid)',
              }}
            >
              {opt.value}
            </button>
          );
        })}
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
        {selectedShort ?? hint}
      </p>
    </div>
  );
}
