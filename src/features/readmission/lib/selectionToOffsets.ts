import { detectSections, sectionTitleAtChar } from '@/features/readmission/lib/detectSections';
import { normalizeWs } from '@/features/readmission/lib/normalizeWs';
import type { ClinicalNoteType, PendingSelection } from '@/features/readmission/types/readmissionAnnotation';

const CHAR_START = 'data-char-start';

function charSpanElement(node: Node, noteRoot: HTMLElement): HTMLElement | null {
  let el: Element | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);

  while (el && el !== noteRoot) {
    if (el.hasAttribute(CHAR_START) && el.hasAttribute('data-char-end')) {
      return el as HTMLElement;
    }
    el = el.parentElement;
  }
  return null;
}

/** Map a range boundary (text node or element child index) to a global char offset. */
function offsetInNote(node: Node, nodeOffset: number, noteRoot: HTMLElement): number | null {
  const spanEl = charSpanElement(node, noteRoot);
  if (!spanEl) return null;

  const base = Number.parseInt(spanEl.getAttribute(CHAR_START) ?? '', 10);
  if (Number.isNaN(base)) return null;

  try {
    const r = document.createRange();
    r.setStart(spanEl, 0);
    r.setEnd(node, nodeOffset);
    return base + r.toString().length;
  } catch {
    if (node.nodeType === Node.TEXT_NODE) {
      return base + nodeOffset;
    }
    return base;
  }
}

export type SelectionMappingResult =
  | { ok: true; selection: PendingSelection & { mappingError: null } }
  | { ok: false; selection: PendingSelection | null; error: string };

export function selectionToOffsets(
  sel: Selection | null,
  noteRoot: HTMLElement | null,
  rawNote: string,
  noteType: ClinicalNoteType,
): SelectionMappingResult {
  if (!sel || !noteRoot || sel.isCollapsed || sel.rangeCount === 0) {
    return { ok: false, selection: null, error: '' };
  }

  if (!noteRoot.contains(sel.anchorNode) || !noteRoot.contains(sel.focusNode)) {
    return { ok: false, selection: null, error: '' };
  }

  const range = sel.getRangeAt(0);
  const anchorStart = offsetInNote(range.startContainer, range.startOffset, noteRoot);
  const focusEnd = offsetInNote(range.endContainer, range.endOffset, noteRoot);

  if (anchorStart === null || focusEnd === null) {
    return {
      ok: false,
      selection: null,
      error: 'Could not map selection to exact note offsets.',
    };
  }

  const lo = Math.min(anchorStart, focusEnd);
  const hi = Math.max(anchorStart, focusEnd);

  if (lo === hi) {
    return { ok: false, selection: null, error: '' };
  }

  const selectedText = rawNote.slice(lo, hi);
  const browserText = sel.toString();
  const sections = detectSections(rawNote);
  const sectionTitle = sectionTitleAtChar(sections, lo);

  if (normalizeWs(browserText) !== normalizeWs(selectedText)) {
    const partial: PendingSelection = {
      noteType,
      startChar: lo,
      endChar: hi,
      selectedText,
      sectionTitle,
      mappingError:
        'Could not map selection to exact note offsets. Try selecting text within a single paragraph.',
    };
    return { ok: false, selection: partial, error: partial.mappingError! };
  }

  return {
    ok: true,
    selection: {
      noteType,
      startChar: lo,
      endChar: hi,
      selectedText,
      sectionTitle,
      mappingError: null,
    },
  };
}
