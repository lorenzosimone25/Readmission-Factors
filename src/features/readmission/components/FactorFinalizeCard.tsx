import { useEffect, useState } from 'react';

import { ConfidenceScale } from '@/features/readmission/components/ConfidenceScale';
import { GroupHighlightList } from '@/features/readmission/components/GroupHighlightList';
import { accentForGroupColor } from '@/features/readmission/lib/groupColors';
import { isDefaultFactorLabel } from '@/features/readmission/lib/factorLabelUtils';
import {
  countWords,
  MAX_FACTOR_NOTE_WORDS,
  truncateToWordLimit,
} from '@/features/readmission/lib/noteLimits';
import { ROLE_OPTIONS } from '@/features/readmission/lib/vocabLabels';
import type {
  EvidenceGroup,
  EvidenceSpan,
  FactorConfidence,
  FactorFinalizePatch,
  FactorFormDraft,
  FactorRole,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  group: EvidenceGroup;
  spans: EvidenceSpan[];
  existingFactor?: ReadmissionFactor | null;
  draft?: FactorFormDraft | null;
  onFinalize: (patch: FactorFinalizePatch) => void;
  onJumpToSpan: (spanId: string) => void;
  onRemoveHighlight: (spanId: string) => void;
  onGroupNoteChange?: (note: string) => void;
  onLabelChange?: (label: string) => void;
  compact?: boolean;
};

const inputClass = 'mt-0.5 w-full rounded-lg border px-2 py-1.5 text-sm outline-none';

function resolveInitialFields(
  existingFactor: ReadmissionFactor | null | undefined,
  draft: FactorFormDraft | null | undefined,
  groupNote: string,
): FactorFormDraft {
  if (draft) return draft;
  if (existingFactor) {
    return {
      role: existingFactor.role,
      confidence: existingFactor.confidence,
      note: existingFactor.note ?? '',
    };
  }
  return { role: null, confidence: null, note: groupNote };
}

export function FactorFinalizeCard({
  group,
  spans,
  existingFactor = null,
  draft = null,
  onFinalize,
  onJumpToSpan,
  onRemoveHighlight,
  onGroupNoteChange,
  onLabelChange,
  compact = false,
}: Props) {
  const isEditing = Boolean(existingFactor);
  const initial = resolveInitialFields(existingFactor, draft, group.note ?? '');

  const [role, setRole] = useState<FactorRole | null>(initial.role);
  const [confidence, setConfidence] = useState<FactorConfidence | null>(initial.confidence);
  const [note, setNote] = useState(initial.note);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const noteWordCount = countWords(note);
  const labelIsDefault = isDefaultFactorLabel(group.label.trim());

  useEffect(() => {
    const next = resolveInitialFields(existingFactor, draft, group.note ?? '');
    setRole(next.role);
    setConfidence(next.confidence);
    setNote(next.note);
  }, [group.id, existingFactor?.id]);

  const buildPatch = (): FactorFinalizePatch | null => {
    if (!role || confidence === null) return null;
    return {
      label: group.label.trim(),
      role,
      modifiability: existingFactor?.modifiability ?? 'uncertain',
      foreseeableFromIndexDischarge: existingFactor?.foreseeableFromIndexDischarge ?? 'uncertain',
      confidence,
      rationale: existingFactor?.rationale ?? '',
      note: note.trim(),
    };
  };

  const handleSave = () => {
    if (labelIsDefault || !group.label.trim()) {
      setFieldErrors(['Give this factor a clinical label before saving.']);
      return;
    }
    const patch = buildPatch();
    if (!patch) {
      setFieldErrors(['Select role and confidence before saving.']);
      return;
    }
    if (note.trim() && noteWordCount > MAX_FACTOR_NOTE_WORDS) {
      setFieldErrors([`Clinician note must be ${MAX_FACTOR_NOTE_WORDS} words or fewer.`]);
      return;
    }
    setFieldErrors([]);
    onGroupNoteChange?.(patch.note);
    onFinalize(patch);
  };

  const handleNoteInput = (value: string) => {
    setNote(truncateToWordLimit(value));
    setFieldErrors([]);
  };

  const canSave =
    (isEditing || spans.length > 0) &&
    Boolean(role) &&
    confidence !== null &&
    !labelIsDefault &&
    group.label.trim().length > 0 &&
    noteWordCount <= MAX_FACTOR_NOTE_WORDS;

  const formFields = (
    <div
      className={compact ? 'space-y-2' : 'mt-3 space-y-2'}
      style={{
        background: 'var(--color-panel-solid)',
      }}
    >
      <label className="block">
        <span
          className="block text-[10px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Label <span style={{ color: 'var(--color-accent-danger)' }}>*</span>
        </span>
        <input
          className={inputClass}
          style={{
            borderColor: labelIsDefault
              ? 'var(--color-accent-danger)'
              : 'var(--color-border-strong)',
            background: 'var(--color-panel-solid)',
            color: 'var(--color-text-primary)',
          }}
          value={group.label}
          onChange={(e) => {
            onLabelChange?.(e.target.value);
            if (fieldErrors.length > 0) setFieldErrors([]);
          }}
          placeholder="e.g. Recurrent ischemia"
          aria-label="Factor label"
          aria-invalid={labelIsDefault || !group.label.trim() ? true : undefined}
          required
        />
        {labelIsDefault ? (
          <span
            className="mt-0.5 block text-[10px]"
            style={{ color: 'var(--color-accent-danger)' }}
          >
            Give this factor a clinical label before saving.
          </span>
        ) : null}
      </label>

      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Role <span style={{ color: 'var(--color-accent-danger)' }}>*</span>
        </p>
        <div
          className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Readmission factor role"
        >
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.value;
            const palette = {
              bg: 'var(--color-accent-blue)',
              border: 'var(--color-accent-blue)',
            };
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setRole(opt.value);
                  setFieldErrors([]);
                }}
                className="rounded-lg border-2 px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  borderColor: selected ? palette.border : 'var(--color-border-strong)',
                  background: selected ? palette.bg : 'var(--color-panel-solid)',
                  boxShadow: selected ? '0 1px 3px hsla(0, 0%, 0%, 0.15)' : 'none',
                  // @ts-expect-error -- CSS custom property for tailwind ring color
                  '--tw-ring-color': palette.border,
                  '--tw-ring-offset-color': 'var(--color-panel-solid)',
                }}
              >
                <span
                  className="block text-xs font-semibold"
                  style={{ color: selected ? '#ffffff' : 'var(--color-text-primary)' }}
                >
                  {opt.label}
                </span>
                <span
                  className="mt-0.5 block text-[10px]"
                  style={{
                    color: selected ? 'hsla(0, 0%, 100%, 0.88)' : 'var(--color-text-tertiary)',
                  }}
                >
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ConfidenceScale value={confidence} onChange={setConfidence} />

      <label
        className="block text-[10px] font-medium uppercase tracking-wide"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Clinician note (optional)
        <textarea
          className={`${inputClass} min-h-[56px] resize-y`}
          style={{
            borderColor: 'var(--color-border-strong)',
            background: 'var(--color-panel-solid)',
          }}
          value={note}
          onChange={(e) => handleNoteInput(e.target.value)}
          onBlur={() => onGroupNoteChange?.(note.trim())}
          placeholder="Optional context about this factor…"
          rows={2}
        />
        <span
          className="mt-0.5 block text-[10px]"
          style={{
            color:
              noteWordCount > MAX_FACTOR_NOTE_WORDS
                ? 'var(--color-accent-danger)'
                : 'var(--color-text-tertiary)',
          }}
        >
          {noteWordCount} / {MAX_FACTOR_NOTE_WORDS} words
        </span>
      </label>

      {fieldErrors.length > 0 ? (
        <ul
          className="rounded border px-2 py-1.5 text-[10px]"
          style={{ borderColor: 'var(--color-accent-danger)', color: 'var(--color-accent-danger)' }}
        >
          {fieldErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="w-full rounded-lg py-2 text-xs font-medium text-white disabled:opacity-40"
        style={{ background: 'var(--color-accent-blue)' }}
      >
        {isEditing ? 'Save changes' : 'Save & complete factor'}
      </button>
    </div>
  );

  if (compact) {
    return formFields;
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: accentForGroupColor(group.color),
        background: 'var(--color-panel-solid)',
      }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {group.label}
        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
          {spans.length} highlight{spans.length !== 1 ? 's' : ''}
        </span>
      </p>
      <div className="mt-2 max-h-[120px] overflow-y-auto">
        <GroupHighlightList spans={spans} onJump={onJumpToSpan} onRemove={onRemoveHighlight} />
      </div>
      {formFields}
    </div>
  );
}
