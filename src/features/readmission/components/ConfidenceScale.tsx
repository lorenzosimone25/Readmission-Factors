import { CONFIDENCE_SCALE } from '@/features/readmission/lib/vocabLabels';
import type { FactorConfidence } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  value: FactorConfidence | null;
  onChange: (value: FactorConfidence) => void;
};

export function ConfidenceScale({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Confidence level from 1 to 5">
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
        Confidence <span style={{ color: 'var(--color-accent-danger)' }}>*</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
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
              className="min-w-[2rem] rounded-lg border px-2 py-1.5 text-xs font-semibold transition-opacity"
              style={{
                borderColor: selected ? 'var(--color-accent-blue)' : 'var(--color-border)',
                background: selected ? 'hsla(210, 75%, 55%, 0.12)' : 'var(--color-panel-alt)',
                color: selected ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
              }}
            >
              {opt.value}
            </button>
          );
        })}
      </div>
      {value ? (
        <p className="mt-1 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {CONFIDENCE_SCALE.find((o) => o.value === value)?.short}
        </p>
      ) : (
        <p className="mt-1 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Select how confident you are in this factor (1 = very low, 5 = very high).
        </p>
      )}
    </div>
  );
}
