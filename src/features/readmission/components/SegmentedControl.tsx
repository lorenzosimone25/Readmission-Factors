type Option<T extends string> = {
  id: T;
  label: string;
  /** Show a red dot when this tab has incomplete required work. */
  alert?: boolean;
  alertTitle?: string;
};

type Props<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      className="grid gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel-alt)' }}
      role="radiogroup"
      aria-label={ariaLabel}
      data-no-card-select
    >
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
              className="flex min-h-8 items-center justify-center rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                borderColor: selected ? 'var(--color-accent-blue)' : 'transparent',
                background: selected ? 'var(--color-accent-blue)' : 'var(--color-panel-solid)',
                color: selected ? '#ffffff' : 'var(--color-text-secondary)',
                boxShadow: selected ? '0 1px 2px hsla(0, 0%, 0%, 0.12)' : 'none',
                // @ts-expect-error -- CSS custom property for tailwind ring tokens
                '--tw-ring-color': 'var(--color-accent-blue)',
                '--tw-ring-offset-color': 'var(--color-panel-alt)',
              }}
            >
              <span className="relative inline-flex items-center pr-2">
                {opt.label}
                {opt.alert ? (
                  <span
                    className="absolute right-0 top-0 h-2 w-2 -translate-y-1/2 rounded-full border-2"
                    style={{
                      background: 'var(--color-accent-danger)',
                      borderColor: 'var(--color-panel-alt)',
                    }}
                    title={opt.alertTitle ?? 'Required fields incomplete'}
                    aria-label={opt.alertTitle ?? 'Required fields incomplete'}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
