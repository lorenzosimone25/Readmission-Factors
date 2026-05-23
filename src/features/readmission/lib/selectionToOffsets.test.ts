import { describe, expect, it } from 'vitest';

import { normalizeWs } from '@/features/readmission/lib/normalizeWs';
import { selectionToOffsets } from '@/features/readmission/lib/selectionToOffsets';

describe('selectionToOffsets', () => {
  it('maps selection inside a single char span', () => {
    const rawNote = 'Hello world';
    document.body.innerHTML = `
      <div class="note-root">
        <span data-char-start="0" data-char-end="11">Hello world</span>
      </div>
    `;
    const noteRoot = document.querySelector('.note-root') as HTMLElement;
    const textNode = noteRoot.querySelector('span')!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const result = selectionToOffsets(sel, noteRoot, rawNote, 'readmission');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.selection.startChar).toBe(0);
      expect(result.selection.endChar).toBe(5);
      expect(result.selection.selectedText).toBe('Hello');
      expect(result.selection.mappingError).toBeNull();
    }
  });

  it('returns mapping error when browser text does not match slice', () => {
    const rawNote = 'Hello world';
    document.body.innerHTML = `
      <div class="note-root">
        <span data-char-start="0" data-char-end="11">Hello world</span>
      </div>
    `;
    const noteRoot = document.querySelector('.note-root') as HTMLElement;
    const textNode = noteRoot.querySelector('span')!.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = {
      isCollapsed: false,
      rangeCount: 1,
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => range,
      toString: () => 'Goodbye', // does not match slice
      contains: (n: Node) => noteRoot.contains(n),
    } as unknown as Selection;

    const result = selectionToOffsets(sel, noteRoot, rawNote, 'readmission');
    expect(result.ok).toBe(false);
    expect(result.selection?.mappingError).toBeTruthy();
    expect(normalizeWs('Goodbye')).not.toBe(normalizeWs('Hello'));
  });
});
