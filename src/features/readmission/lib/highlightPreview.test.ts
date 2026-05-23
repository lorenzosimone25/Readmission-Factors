import { describe, expect, it } from 'vitest';

import { highlightPreviewText } from '@/features/readmission/lib/highlightPreview';

describe('highlightPreviewText', () => {
  it('returns first and last word for longer text', () => {
    expect(highlightPreviewText('recurrent chest pain with dyspnea')).toBe('recurrent…dyspnea');
  });

  it('returns full text for two or fewer words', () => {
    expect(highlightPreviewText('chest pain')).toBe('chest pain');
    expect(highlightPreviewText('dyspnea')).toBe('dyspnea');
  });
});
