import { describe, expect, it } from 'vitest';

import { validateForSubmit } from '@/features/readmission/lib/annotationValidation';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

describe('validateForSubmit canonical offsets', () => {
  const canonical = 'Chief Complaint:\nChest pain for two days.';

  it('accepts spans sliced from canonical note', () => {
    const groups = createDefaultEvidenceGroups();
    const group = groups[0]!;
    const ann: ClinicianReadmissionAnnotation = {
      caseId: '1',
      reviewerId: 'u',
      noteVersionHash: 'h',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: 'draft',
      evidenceGroups: [{ ...group, finalizedFactorId: 'f1' }],
      factors: [
        {
          id: 'f1',
          label: 'Factor 1',
          role: 'primary',
          modifiability: 'uncertain',
          foreseeableFromIndexDischarge: 'uncertain',
          confidence: 4,
          rationale: '',
          note: '',
          evidenceSpanIds: ['sp1'],
        },
      ],
      evidenceSpans: [
        {
          id: 'sp1',
          caseId: '1',
          noteType: 'readmission',
          groupId: group.id,
          factorId: 'f1',
          sectionTitle: 'Chief Complaint',
          startChar: 0,
          endChar: 17,
          selectedText: canonical.slice(0, 17),
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = validateForSubmit(ann, {
      indexRawNote: 'raw index',
      readmissionRawNote: 'raw readmit',
      indexCanonicalNote: 'raw index',
      readmissionCanonicalNote: canonical,
      noteVersionHash: 'h',
    });
    expect(result.errors.some((e) => e.includes('selectedText does not match'))).toBe(false);
  });
});
