import { describe, expect, it } from 'vitest';

import { normalizeWs } from '@/features/readmission/lib/normalizeWs';
import { selectionToOffsets, textInCharSpanRange } from '@/features/readmission/lib/selectionToOffsets';

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

  it('maps selection on heading lines with secondary styling', () => {
    const rawNote = 'Chief Complaint:\nChest pain.';
    document.body.innerHTML = `
      <div class="note-root">
        <span data-char-start="0" data-char-end="17" style="color: var(--color-text-secondary); font-weight: 600">Chief Complaint:
</span><span data-char-start="17" data-char-end="28">Chest pain.</span>
      </div>
    `;
    const noteRoot = document.querySelector('.note-root') as HTMLElement;
    const headingText = noteRoot.querySelectorAll('span')[0]!.firstChild!;
    const range = document.createRange();
    range.setStart(headingText, 0);
    range.setEnd(headingText, 16);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const result = selectionToOffsets(sel, noteRoot, rawNote, 'readmission');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.selection.selectedText).toBe('Chief Complaint:');
    }
  });

  it('extracts char-span text from range without CSS transform artifacts', () => {
    document.body.innerHTML = `
      <div class="note-root">
        <span data-char-start="0" data-char-end="5" style="text-transform: uppercase">Hello</span>
      </div>
    `;
    const noteRoot = document.querySelector('.note-root') as HTMLElement;
    const textNode = noteRoot.querySelector('span')!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    expect(textInCharSpanRange(range, noteRoot)).toBe('Hello');
  });

  it('returns mapping error when DOM char-span text does not match canonical slice', () => {
    const rawNote = 'Hello world';
    document.body.innerHTML = `
      <div class="note-root">
        <span data-char-start="0" data-char-end="11">Goodbye world</span>
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
    expect(result.ok).toBe(false);
    expect(result.selection?.mappingError).toBeTruthy();
    expect(normalizeWs('Goodbye')).not.toBe(normalizeWs('Hello'));
  });
});
