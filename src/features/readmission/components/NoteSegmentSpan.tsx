import type {
  ClinicalNoteType,
  EvidenceGroup,
  HighlightClickPayload,
  NoteSegment,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';
import { highlightForGroup } from '@/features/readmission/lib/highlightColors';
import { roleLabel } from '@/features/readmission/lib/vocabLabels';

type Props = {
  seg: NoteSegment;
  noteType: ClinicalNoteType;
  groupById: Map<string, EvidenceGroup>;
  factorById: Map<string, ReadmissionFactor>;
  onHighlightClick: (payload: HighlightClickPayload) => void;
};

export function NoteSegmentSpan({ seg, noteType, groupById, factorById, onHighlightClick }: Props) {
  const noteSource = noteType === 'index_hf' ? 'Index HF' : 'Readmission';
  const highlighted = seg.highlightGroupIds.length > 0;
  const primaryGroupId = seg.highlightGroupIds[0];
  const primaryGroup = primaryGroupId ? groupById.get(primaryGroupId) : undefined;
  const factorLabel =
    primaryGroup?.finalizedFactorId &&
    factorById.get(primaryGroup.finalizedFactorId)?.label;

  const tooltipParts = seg.highlightGroupIds
    .map((gid) => {
      const g = groupById.get(gid);
      if (!g) return null;
      const f = g.finalizedFactorId ? factorById.get(g.finalizedFactorId) : null;
      const factorPart = f ? ` → ${f.label || 'Factor'}` : '';
      return `${g.label}${factorPart}${f ? ` · ${noteSource} · ${roleLabel(f.role)}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');

  const headingStyle = seg.isHeadingLine
    ? {
        color: 'var(--color-text-tertiary)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
      }
    : undefined;

  const content = (
    <span
      data-char-start={seg.startChar}
      data-char-end={seg.endChar}
      className={seg.isHeadingLine ? 'scroll-mt-6' : undefined}
      style={headingStyle}
    >
      {seg.text}
    </span>
  );

  if (!highlighted) {
    return <span key={`${seg.startChar}-${seg.endChar}`}>{content}</span>;
  }

  return (
    <mark
      key={`${seg.startChar}-${seg.endChar}`}
      data-char-start={seg.startChar}
      data-char-end={seg.endChar}
      data-group-ids={seg.highlightGroupIds.join(',')}
      title={tooltipParts}
      className="cursor-pointer rounded-sm px-0"
      style={{
        background: highlightForGroup(primaryGroup),
        color: 'inherit',
        boxDecorationBreak: 'clone',
      }}
      onClick={(e) => {
        e.preventDefault();
        const spanId = seg.highlightSpanIds[0];
        if (!spanId) return;
        onHighlightClick({
          spanId,
          noteType,
          anchorRect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
        });
      }}
      tabIndex={0}
      role="button"
      aria-label={
        factorLabel
          ? `Highlight for ${factorLabel}. Click for options.`
          : `Highlight: ${tooltipParts}. Click for options.`
      }
    >
      {seg.text}
    </mark>
  );
}
