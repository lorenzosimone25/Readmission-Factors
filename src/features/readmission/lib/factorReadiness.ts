import {
  countWords,
  isNoteWithinWordLimit,
  MAX_FACTOR_NOTE_WORDS,
} from '@/features/readmission/lib/noteLimits';
import { isDefaultFactorLabel } from '@/features/readmission/lib/factorLabelUtils';
import type {
  EvidenceGroup,
  EvidenceSpan,
  FactorFormDraft,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

export type GroupCompletionStatus = 'empty' | 'in_progress' | 'complete';

export type FactorReadiness = {
  ready: boolean;
  issues: string[];
};

export function getFactorReadiness(
  factor: ReadmissionFactor,
  spans: EvidenceSpan[],
): FactorReadiness {
  const issues: string[] = [];
  if (!factor.label.trim()) issues.push('Label required');
  else if (isDefaultFactorLabel(factor.label)) issues.push('Rename from default Factor N');
  if (factor.role !== 'primary' && factor.role !== 'contributing') {
    issues.push('Role must be Primary or Contributing');
  }
  if (factor.confidence < 1 || factor.confidence > 5) issues.push('Confidence required (1–5)');
  if (factor.note.trim() && !isNoteWithinWordLimit(factor.note)) {
    issues.push(`Note exceeds ${MAX_FACTOR_NOTE_WORDS} words (${countWords(factor.note)})`);
  }
  if (spans.length === 0) issues.push('Evidence required');
  return { ready: issues.length === 0, issues };
}

export function getGroupCompletionStatus(
  group: EvidenceGroup,
  spans: EvidenceSpan[],
  factor: ReadmissionFactor | null | undefined,
  draft?: FactorFormDraft | null,
): GroupCompletionStatus {
  if (spans.length === 0) return 'empty';

  if (!group.finalizedFactorId || !factor) {
    const label = group.label.trim();
    const role = draft?.role ?? null;
    const confidence = draft?.confidence ?? null;
    if (!role || confidence === null || !label || isDefaultFactorLabel(label)) {
      return 'in_progress';
    }
    return 'in_progress';
  }

  return getFactorReadiness(factor, spans).ready ? 'complete' : 'in_progress';
}
