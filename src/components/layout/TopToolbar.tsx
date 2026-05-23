type Props = {
  title: string;
  subtitle: string;
};

export function TopToolbar({ title, subtitle }: Props) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="text-left">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {subtitle}
        </p>
      </div>
    </header>
  );
}
