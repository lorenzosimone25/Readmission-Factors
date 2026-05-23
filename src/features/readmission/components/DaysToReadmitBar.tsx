type Props = {
  days: number;
};

const SCALE_MAX_DAYS = 30;

function colorForDays(d: number): string {
  const t = Math.max(0, Math.min(1, d / SCALE_MAX_DAYS));
  const hue = t * 130;
  return `hsl(${hue} 70% 45%)`;
}

export function DaysToReadmitBar({ days }: Props) {
  const clamped = Math.max(0, Math.min(SCALE_MAX_DAYS, days));
  const widthPct = (clamped / SCALE_MAX_DAYS) * 100;
  const fillColor = colorForDays(days);

  return (
    <div
      className="flex items-center gap-2"
      title={`${days.toLocaleString()} day${days === 1 ? '' : 's'} to readmission`}
    >
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ background: 'var(--color-border)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SCALE_MAX_DAYS}
        aria-valuenow={clamped}
        aria-label={`${days} days to readmission`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
          style={{ width: `${widthPct}%`, background: fillColor }}
        />
      </div>
      <span
        className="shrink-0 text-[11px] font-medium tabular-nums"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {days.toLocaleString()}d
      </span>
    </div>
  );
}
