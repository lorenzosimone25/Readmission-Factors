import type { ClinicalNoteType, EvidenceSpan } from '@/features/readmission/types/readmissionAnnotation';

export function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingOtherGroupSpan(
  spans: EvidenceSpan[],
  startChar: number,
  endChar: number,
  activeGroupId: string,
  noteType: ClinicalNoteType,
): EvidenceSpan | undefined {
  return spans.find(
    (sp) =>
      sp.noteType === noteType &&
      sp.groupId !== activeGroupId &&
      spansOverlap(startChar, endChar, sp.startChar, sp.endChar),
  );
}
