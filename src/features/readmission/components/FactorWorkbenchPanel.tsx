import type { MutableRefObject } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

import { FactorFinalizeCard } from '@/features/readmission/components/FactorFinalizeCard';
import { GroupHighlightList } from '@/features/readmission/components/GroupHighlightList';
import { getGroupCompletionStatus } from '@/features/readmission/lib/factorReadiness';
import { highlightPreviewText } from '@/features/readmission/lib/highlightPreview';
import {
  accentForGroupColor,
  activeFactorCardBackground,
  activeFactorCardBorder,
  activeFactorCardShadow,
} from '@/features/readmission/lib/groupColors';
import { roleLabel } from '@/features/readmission/lib/vocabLabels';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceSpan,
  FactorFinalizePatch,
  FactorFormDraft,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  annotation: ClinicianReadmissionAnnotation;
  spansByGroupId: Map<string, EvidenceSpan[]>;
  factorById: Map<string, ReadmissionFactor>;
  expandedGroupId: string | null;
  activeGroupId: string | null;
  groupCardRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  isDefaultFactorLabel: (label: string) => boolean;
  getFactorFormDraft: (groupId: string) => FactorFormDraft | undefined;
  onSelectGroup: (groupId: string) => void;
  onToggleExpand: (groupId: string) => void;
  onRenameGroup: (groupId: string, label: string) => void;
  onAddFactor: () => void;
  onDeleteFactor: (groupId: string) => void;
  onSaveFactor: (groupId: string, patch: FactorFinalizePatch) => void;
  onUpdateGroupNote: (groupId: string, note: string) => void;
  onJumpToSpan: (spanId: string) => void;
  onRemoveHighlight: (spanId: string) => void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, input, textarea, select, a, [data-no-card-select]'));
}

export function FactorWorkbenchPanel({
  annotation,
  spansByGroupId,
  factorById,
  expandedGroupId,
  activeGroupId,
  groupCardRefs,
  isDefaultFactorLabel,
  getFactorFormDraft,
  onSelectGroup,
  onToggleExpand,
  onRenameGroup,
  onAddFactor,
  onDeleteFactor,
  onSaveFactor,
  onUpdateGroupNote,
  onJumpToSpan,
  onRemoveHighlight,
}: Props) {
  const groups = annotation.evidenceGroups;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="shrink-0 space-y-2 border-b p-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <button
          type="button"
          onClick={() => onAddFactor()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold"
          style={{
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-panel-solid)',
          }}
        >
          <Plus className="h-4 w-4" />
          {groups.length === 0 ? 'Add your first factor' : 'Add another factor'}
        </button>
        {groups.length > 0 ? (
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Click a factor card to activate it for highlighting. Open a card to set its label and metadata.
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {groups.length === 0 ? (
          <p
            className="rounded-lg border px-3 py-6 text-center text-xs"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
          >
            Add a readmission factor above, then select text in the note and click Highlight.
          </p>
        ) : null}

        {groups.map((group) => {
          const spans = spansByGroupId.get(group.id) ?? [];
          const isExpanded = expandedGroupId === group.id;
          const isActive = activeGroupId === group.id;
          const factor = group.finalizedFactorId
            ? factorById.get(group.finalizedFactorId)
            : null;
          const draft = getFactorFormDraft(group.id);
          const completionStatus = getGroupCompletionStatus(group, spans, factor, draft);
          const preview = spans[0]?.selectedText;
          const previewText = preview ? highlightPreviewText(preview) : null;
          const defaultLabel = isDefaultFactorLabel(group.label);

          return (
            <div
              key={group.id}
              ref={(el) => {
                if (el) groupCardRefs.current.set(group.id, el);
                else groupCardRefs.current.delete(group.id);
              }}
              className="rounded-lg border-2 transition-[box-shadow,background-color,border-color] hover:bg-[var(--color-panel-alt)]"
              aria-selected={isActive}
              style={{
                borderColor: isActive
                  ? activeFactorCardBorder(group.color)
                  : 'var(--color-border-strong)',
                background:
                  isActive && !isExpanded
                    ? activeFactorCardBackground(group.color)
                    : 'var(--color-panel-solid)',
                boxShadow: isActive ? activeFactorCardShadow(group.color) : 'none',
              }}
              onClick={(e) => {
                if (isInteractiveTarget(e.target)) return;
                onSelectGroup(group.id);
              }}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(group.id);
                  }}
                  className="shrink-0 opacity-70"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: accentForGroupColor(group.color) }}
                  aria-hidden
                />
                <span
                  className="min-w-0 flex-1 truncate text-sm font-medium"
                  style={{
                    color: defaultLabel
                      ? 'var(--color-accent-danger)'
                      : 'var(--color-text-primary)',
                  }}
                  title={group.label}
                >
                  {group.label || 'Unnamed factor'}
                </span>
                {completionStatus === 'complete' ? (
                  <span
                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: 'hsla(145, 55%, 55%, 0.22)',
                      color: 'hsl(145, 45%, 28%)',
                      borderColor: 'hsla(145, 45%, 40%, 0.45)',
                    }}
                  >
                    Complete
                  </span>
                ) : completionStatus === 'in_progress' ? (
                  <span
                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: 'hsla(0, 70%, 50%, 0.14)',
                      color: 'var(--color-accent-danger)',
                      borderColor: 'hsla(0, 70%, 50%, 0.45)',
                    }}
                  >
                    Incomplete
                  </span>
                ) : (
                  <span
                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: 'var(--color-panel-alt)',
                      color: 'var(--color-text-secondary)',
                      borderColor: 'var(--color-border-strong)',
                    }}
                  >
                    Needs highlights
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFactor(group.id);
                  }}
                  className="shrink-0 rounded p-1 opacity-50 hover:opacity-100"
                  aria-label={`Delete ${group.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {!isExpanded && previewText ? (
                <p
                  className="border-t px-3 py-2 text-xs italic"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    background: isActive
                      ? activeFactorCardBackground(group.color)
                      : 'var(--color-panel-alt)',
                  }}
                >
                  &ldquo;{previewText}&rdquo;
                  {spans.length > 1 ? ` +${spans.length - 1} more` : ''}
                </p>
              ) : null}

              {!isExpanded && completionStatus === 'complete' && factor ? (
                <p
                  className="border-t px-3 py-2 text-[11px]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
                >
                  {roleLabel(factor.role)} · confidence {factor.confidence}
                  {factor.note?.trim()
                    ? ` · Note: ${factor.note.slice(0, 40)}${factor.note.length > 40 ? '…' : ''}`
                    : ''}
                </p>
              ) : null}

              {isExpanded ? (
                <div
                  className="border-t px-3 py-2"
                  style={{ borderColor: 'var(--color-border)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {spans.length > 0 ? (
                    <GroupHighlightList
                      spans={spans}
                      onJump={onJumpToSpan}
                      onRemove={onRemoveHighlight}
                    />
                  ) : (
                    <p className="py-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      No highlights yet. This factor is active — select text in the note, then click
                      Highlight.
                    </p>
                  )}

                  <div className="mt-2">
                    <FactorFinalizeCard
                      group={group}
                      spans={spans}
                      existingFactor={factor}
                      draft={draft}
                      onFinalize={(patch) => onSaveFactor(group.id, patch)}
                      onGroupNoteChange={(note) => onUpdateGroupNote(group.id, note)}
                      onLabelChange={(label) => onRenameGroup(group.id, label)}
                      onJumpToSpan={onJumpToSpan}
                      onRemoveHighlight={onRemoveHighlight}
                      compact
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
