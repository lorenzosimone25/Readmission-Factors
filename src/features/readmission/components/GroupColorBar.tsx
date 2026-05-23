import { Plus } from 'lucide-react';

import { accentForGroupColor, groupHighlightBackground } from '@/features/readmission/lib/groupColors';
import type { EvidenceGroup } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  groups: EvidenceGroup[];
  activeGroupId: string | null;
  spansByGroupId: Map<string, unknown[]>;
  selectionReady?: boolean;
  onSelectGroup: (groupId: string) => void;
  onAddFactor: () => void;
};

/** Quick switcher for which factor receives the next highlight. */
export function GroupColorBar({
  groups,
  activeGroupId,
  spansByGroupId,
  selectionReady = false,
  onSelectGroup,
  onAddFactor,
}: Props) {
  const active = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="space-y-1.5">
      {active ? (
        <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Highlighting as:{' '}
          <span style={{ color: accentForGroupColor(active.color) }}>{active.label}</span>
        </p>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--color-accent-warning)' }}>
          Select a factor in the right panel to highlight.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Switch active factor">
        {groups.map((g) => {
          const isActive = g.id === activeGroupId;
          const count = spansByGroupId.get(g.id)?.length ?? 0;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGroup(g.id)}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity"
              style={{
                borderColor: isActive ? accentForGroupColor(g.color) : 'var(--color-border)',
                background: isActive ? groupHighlightBackground(g.color) : 'var(--color-panel-alt)',
                color: 'var(--color-text-primary)',
                boxShadow: isActive ? `inset 0 0 0 1px ${accentForGroupColor(g.color)}` : undefined,
              }}
              aria-pressed={isActive}
            >
              <span className="relative shrink-0" aria-hidden>
                <span
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ background: accentForGroupColor(g.color) }}
                />
                {isActive && selectionReady ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: accentForGroupColor(g.color) }}
                  />
                ) : null}
              </span>
              {g.label}
              {count > 0 ? (
                <span
                  className="rounded-full px-1.5 text-[10px]"
                  style={{ background: 'var(--color-panel-solid)', color: 'var(--color-text-tertiary)' }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onAddFactor()}
          className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium"
          style={{
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-panel-alt)',
          }}
          aria-label="Add another factor"
        >
          <Plus className="h-3.5 w-3.5" />
          Add factor
        </button>
      </div>
    </div>
  );
}
