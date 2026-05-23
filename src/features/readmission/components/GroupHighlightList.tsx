import { ArrowUpRight, X } from 'lucide-react';

import { highlightPreviewText } from '@/features/readmission/lib/highlightPreview';
import type { ClinicalNoteType, EvidenceSpan } from '@/features/readmission/types/readmissionAnnotation';

function noteTypeBadge(noteType: ClinicalNoteType): string {
  return noteType === 'index_hf' ? 'Index' : 'Readmission';
}

type Props = {
  spans: EvidenceSpan[];
  onJump: (spanId: string) => void;
  onRemove: (spanId: string) => void;
};

export function GroupHighlightList({ spans, onJump, onRemove }: Props) {
  if (spans.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        No highlights yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {spans.map((sp) => {
        const preview = highlightPreviewText(sp.selectedText);
        return (
          <li
            key={sp.id}
            className="rounded border px-2 py-1.5 text-xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
          >
            <div className="flex flex-wrap items-center gap-1">
              <span
                className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{
                  background: 'var(--color-panel-solid)',
                  color: 'var(--color-text-tertiary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {noteTypeBadge(sp.noteType)}
              </span>
              <p
                className="min-w-0 flex-1 italic leading-snug"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                &ldquo;{preview}&rdquo;
              </p>
            </div>
            {sp.sectionTitle ? (
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {sp.sectionTitle}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onJump(sp.id)}
                className="inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[10px]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-blue)' }}
              >
                <ArrowUpRight className="h-3 w-3" />
                Jump
              </button>
              <button
                type="button"
                onClick={() => onRemove(sp.id)}
                className="ml-auto rounded p-0.5 opacity-60"
                aria-label="Remove"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
