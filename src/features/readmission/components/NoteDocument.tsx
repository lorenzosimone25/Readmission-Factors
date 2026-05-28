import { memo } from 'react';

import { NoteSegmentSpan } from '@/features/readmission/components/NoteSegmentSpan';
import type {
  ClinicalNoteType,
  EvidenceGroup,
  HighlightClickPayload,
  NoteSegment,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  segments: NoteSegment[];
  noteType: ClinicalNoteType;
  groupById: Map<string, EvidenceGroup>;
  factorById: Map<string, ReadmissionFactor>;
  onHighlightClick: (payload: HighlightClickPayload) => void;
};

function NoteDocumentInner({ segments, noteType, groupById, factorById, onHighlightClick }: Props) {
  return (
    <>
      {segments.map((seg) => (
        <NoteSegmentSpan
          key={`${seg.startChar}-${seg.endChar}`}
          seg={seg}
          noteType={noteType}
          groupById={groupById}
          factorById={factorById}
          onHighlightClick={onHighlightClick}
        />
      ))}
    </>
  );
}

export const NoteDocument = memo(NoteDocumentInner);
