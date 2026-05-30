import { describe, expect, it } from 'vitest';

import {
  loadMagicBetaEnabled,
  saveMagicBetaEnabled,
} from '@/features/readmission/lib/magicBeta';

describe('magicBeta persistence', () => {
  it('loads and saves enabled state in localStorage', () => {
    saveMagicBetaEnabled(true);
    expect(loadMagicBetaEnabled()).toBe(true);
    saveMagicBetaEnabled(false);
    expect(loadMagicBetaEnabled()).toBe(false);
  });
});
