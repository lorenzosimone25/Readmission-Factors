import { describe, expect, it } from 'vitest';

import {
  clampIndexPercent,
  loadNotePaneLayout,
  NOTE_PANE_DEFAULT_PERCENT,
  NOTE_PANE_LAYOUT_STORAGE_KEY,
  saveNotePaneLayout,
} from '@/features/readmission/lib/notePaneLayout';

describe('notePaneLayout', () => {
  it('clamps index percent to 20–80', () => {
    expect(clampIndexPercent(10)).toBe(20);
    expect(clampIndexPercent(90)).toBe(80);
    expect(clampIndexPercent(50)).toBe(50);
  });

  it('round-trips layout through localStorage', () => {
    localStorage.setItem(
      NOTE_PANE_LAYOUT_STORAGE_KEY,
      JSON.stringify({ mode: 'split', indexPercent: 35 }),
    );
    expect(loadNotePaneLayout()).toEqual({ mode: 'split', indexPercent: 35 });
    saveNotePaneLayout({ mode: 'index' });
    expect(loadNotePaneLayout()).toEqual({ mode: 'index' });
    localStorage.removeItem(NOTE_PANE_LAYOUT_STORAGE_KEY);
    expect(loadNotePaneLayout()).toEqual({
      mode: 'split',
      indexPercent: NOTE_PANE_DEFAULT_PERCENT,
    });
  });
});
