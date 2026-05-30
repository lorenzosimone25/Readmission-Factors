export const NOTE_PANE_LAYOUT_STORAGE_KEY = 'readmission:note-pane-layout-v1';

export const NOTE_PANE_MIN_PERCENT = 20;
export const NOTE_PANE_MAX_PERCENT = 80;
export const NOTE_PANE_DEFAULT_PERCENT = 50;

export type NotePaneLayout =
  | { mode: 'split'; indexPercent: number }
  | { mode: 'index' }
  | { mode: 'readmission' };

export function clampIndexPercent(value: number): number {
  return Math.min(NOTE_PANE_MAX_PERCENT, Math.max(NOTE_PANE_MIN_PERCENT, value));
}

export function defaultSplitLayout(): NotePaneLayout {
  return { mode: 'split', indexPercent: NOTE_PANE_DEFAULT_PERCENT };
}

export function loadNotePaneLayout(): NotePaneLayout {
  try {
    const raw = localStorage.getItem(NOTE_PANE_LAYOUT_STORAGE_KEY);
    if (!raw) return defaultSplitLayout();
    const parsed = JSON.parse(raw) as NotePaneLayout;
    if (parsed.mode === 'index' || parsed.mode === 'readmission') return parsed;
    if (parsed.mode === 'split' && typeof parsed.indexPercent === 'number') {
      return { mode: 'split', indexPercent: clampIndexPercent(parsed.indexPercent) };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return defaultSplitLayout();
}

export function saveNotePaneLayout(layout: NotePaneLayout): void {
  try {
    localStorage.setItem(NOTE_PANE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* quota / private mode */
  }
}

export function splitIndexPercent(layout: NotePaneLayout): number {
  return layout.mode === 'split' ? layout.indexPercent : NOTE_PANE_DEFAULT_PERCENT;
}
