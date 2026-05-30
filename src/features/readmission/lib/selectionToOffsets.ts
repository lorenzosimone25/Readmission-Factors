import { detectSections, sectionTitleAtChar } from '@/features/readmission/lib/detectSections';
import { normalizeWs } from '@/features/readmission/lib/normalizeWs';
import type { ClinicalNoteType, PendingSelection } from '@/features/readmission/types/readmissionAnnotation';

export type SectionMetaAtChar = (charIndex: number) => {
  sectionTitle: string | null;
  sectionId: string | null;
};

function resolveSectionMeta(
  canonicalNote: string,
  charIndex: number,
  sectionMetaAtChar?: SectionMetaAtChar,
): { sectionTitle: string | null; sectionId: string | null } {
  if (sectionMetaAtChar) return sectionMetaAtChar(charIndex);
  const sections = detectSections(canonicalNote);
  return {
    sectionTitle: sectionTitleAtChar(sections, charIndex),
    sectionId: null,
  };
}

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

/** Extract selected text from raw text nodes inside char spans (immune to CSS text-transform). */
export function textInCharSpanRange(range: Range, noteRoot: HTMLElement): string {
  const walker = document.createTreeWalker(noteRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!charSpanElement(node, noteRoot)) return NodeFilter.FILTER_REJECT;
      try {
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        const intersects =
          range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
          range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0;
        return intersects ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      } catch {
        return NodeFilter.FILTER_REJECT;
      }
    },
  });

  let out = '';
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    let start = 0;
    let end = textNode.length;
    if (textNode === range.startContainer) start = range.startOffset;
    if (textNode === range.endContainer) end = range.endOffset;
    if (start < end) out += textNode.data.slice(start, end);
  }
  return out;
}

export type SelectionMappingResult =
  | { ok: true; selection: PendingSelection & { mappingError: null } }
  | { ok: false; selection: PendingSelection | null; error: string };

export function selectionToOffsets(
  sel: Selection | null,
  noteRoot: HTMLElement | null,
  canonicalNote: string,
  noteType: ClinicalNoteType,
  sectionMetaAtChar?: SectionMetaAtChar,
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

  const selectedText = canonicalNote.slice(lo, hi);
  const browserText = textInCharSpanRange(range, noteRoot);
  const { sectionTitle, sectionId } = resolveSectionMeta(canonicalNote, lo, sectionMetaAtChar);

  if (normalizeWs(browserText) !== normalizeWs(selectedText)) {
    const partial: PendingSelection = {
      noteType,
      startChar: lo,
      endChar: hi,
      selectedText,
      sectionTitle,
      sectionId,
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
      sectionId,
      mappingError: null,
    },
  };
}
