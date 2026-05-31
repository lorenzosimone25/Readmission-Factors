type Option<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
};

/** Secondary inline toggle — visually distinct from primary sidebar section tabs. */
export function ClinicalFieldModeToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      className="inline-flex shrink-0 overflow-hidden rounded-md border"
      style={{ borderColor: 'var(--color-border-strong)' }}
      role="radiogroup"
      aria-label={ariaLabel}
      data-no-card-select
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.id)}
            className="px-2 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset"
            style={{
              background: selected ? 'var(--color-panel-alt)' : 'transparent',
              color: selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              boxShadow: selected ? 'inset 0 -2px 0 var(--color-text-secondary)' : 'none',
              // @ts-expect-error -- CSS custom property for tailwind ring tokens
              '--tw-ring-color': 'var(--color-border-strong)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
