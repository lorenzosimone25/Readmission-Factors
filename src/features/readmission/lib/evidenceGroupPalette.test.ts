import { describe, expect, it } from 'vitest';

import { nextEvidenceGroupColor, nextFactorLabel } from '@/features/readmission/lib/evidenceGroupPalette';

describe('evidenceGroupPalette', () => {
  it('assigns next factor label from existing labels', () => {
    expect(nextFactorLabel([{ label: 'Factor 1' }])).toBe('Factor 2');
    expect(nextFactorLabel([{ label: 'Factor 1' }, { label: 'Factor 3' }])).toBe('Factor 4');
  });

  it('rotates colors avoiding used palette entries first', () => {
    expect(nextEvidenceGroupColor(['amber'])).toBe('blue');
    expect(nextEvidenceGroupColor(['amber', 'blue', 'green', 'violet', 'slate'])).toBe('amber');
  });
});
