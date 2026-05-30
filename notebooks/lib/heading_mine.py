"""Mine candidate headings from discharge summary text."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Iterable

INLINE_HEADING_RE = re.compile(r"(?:^|\n)(\s*)([A-Z][A-Z0-9 \-/]{2,60})\s*:\s*", re.MULTILINE)
LINE_HEADING_RE = re.compile(r"(?:^|\n)(\s*)([A-Z][A-Z0-9 \-/]{2,60})\s*$", re.MULTILINE)


@dataclass
class HeadingStats:
    heading: str
    count: int
    note_hits: int


def mine_inline_headings(texts: Iterable[str]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for text in texts:
        if not text:
            continue
        for m in INLINE_HEADING_RE.finditer(text):
            counts[m.group(2).strip()] += 1
    return counts


def mine_with_note_hits(texts: Iterable[str]) -> list[HeadingStats]:
    heading_notes: dict[str, set[int]] = {}
    counts: Counter[str] = Counter()
    for idx, text in enumerate(texts):
        if not text:
            continue
        seen_in_note: set[str] = set()
        for m in INLINE_HEADING_RE.finditer(text):
            h = m.group(2).strip()
            counts[h] += 1
            seen_in_note.add(h)
        for h in seen_in_note:
            heading_notes.setdefault(h, set()).add(idx)
    return [
        HeadingStats(heading=h, count=counts[h], note_hits=len(heading_notes.get(h, set())))
        for h in counts
    ]
