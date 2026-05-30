"""
Rules-first section detection on raw discharge summaries.

Multi-pass: lexicon aliases (inline colon OK) → generic ALL-CAPS headings → dedupe/denylist.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from section_types import StoredNoteSection

_LEXICON_PATH = Path(__file__).with_name("section_lexicon.json")
_FUZZY_THRESHOLD = 0.82


@dataclass(frozen=True)
class HeadingMatch:
    title: str
    start_char: int
    raw_heading: str
    source: str


def load_lexicon(path: Path | None = None) -> dict[str, Any]:
    lex_path = path or _LEXICON_PATH
    with lex_path.open(encoding="utf-8") as f:
        return json.load(f)


def _normalize_heading(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().upper())


def _alpha_count(text: str) -> int:
    return sum(1 for ch in text if ch.isalpha())


def _build_alias_maps(lexicon: dict[str, Any]) -> tuple[dict[str, str], list[str]]:
    alias_to_title: dict[str, str] = {}
    all_aliases: list[str] = []
    for entry in lexicon.get("canonical", []):
        title = str(entry["title"])
        aliases = [title] + list(entry.get("aliases", []))
        for alias in aliases:
            key = _normalize_heading(alias)
            alias_to_title[key] = title
            all_aliases.append(key)
    all_aliases.sort(key=len, reverse=True)
    return alias_to_title, all_aliases


def _footer_start(raw_note: str, lexicon: dict[str, Any]) -> int | None:
    markers = lexicon.get("footerMarkers") or []
    earliest: int | None = None
    for marker in markers:
        idx = raw_note.find(marker)
        if idx >= 0:
            earliest = idx if earliest is None else min(earliest, idx)
    return earliest


def _is_denied(raw_heading: str, lexicon: dict[str, Any]) -> bool:
    norm = _normalize_heading(raw_heading)
    deny = {_normalize_heading(d) for d in lexicon.get("denyHeadings") or []}
    if norm in deny:
        return True
    if _alpha_count(norm) < 3:
        return True
    return False


def _lexicon_pattern(aliases: list[str]) -> re.Pattern[str]:
    escaped = "|".join(re.escape(a) for a in aliases)
    return re.compile(
        rf"(?:^|\n)(\s*)({escaped})\s*:\s*",
        re.IGNORECASE | re.MULTILINE,
    )


def _generic_pattern() -> re.Pattern[str]:
    return re.compile(
        r"(?:^|\n)(\s*)([A-Z][A-Z0-9 \-/]{2,50})\s*:\s*",
        re.MULTILINE,
    )


def _fuzzy_map(raw_heading: str, alias_to_title: dict[str, str]) -> str | None:
    norm = _normalize_heading(raw_heading)
    if norm in alias_to_title:
        return alias_to_title[norm]
    best_title: str | None = None
    best_score = 0.0
    for alias, title in alias_to_title.items():
        score = SequenceMatcher(None, norm, alias).ratio()
        if score > best_score:
            best_score = score
            best_title = title
    if best_score >= _FUZZY_THRESHOLD and best_title:
        return best_title
    return None


def collect_heading_matches(
    raw_note: str,
    lexicon: dict[str, Any] | None = None,
) -> tuple[list[HeadingMatch], list[str]]:
    """Return sorted heading matches and informational warnings."""
    if not raw_note.strip():
        return [], []

    lex = lexicon or load_lexicon()
    alias_to_title, all_aliases = _build_alias_maps(lex)
    warnings: list[str] = []
    matches: list[HeadingMatch] = []
    seen_starts: set[int] = set()
    footer_at = _footer_start(raw_note, lex)

    lex_re = _lexicon_pattern(all_aliases)
    for m in lex_re.finditer(raw_note):
        start = m.start() + len(m.group(1) or "")
        if start in seen_starts:
            continue
        if footer_at is not None and start >= footer_at:
            continue
        raw_heading = (m.group(2) or "").strip()
        if _is_denied(raw_heading, lex):
            continue
        title = alias_to_title[_normalize_heading(raw_heading)]
        seen_starts.add(start)
        matches.append(
            HeadingMatch(title=title, start_char=start, raw_heading=raw_heading, source="lexicon")
        )

    generic_re = _generic_pattern()
    for m in generic_re.finditer(raw_note):
        start = m.start() + len(m.group(1) or "")
        if start in seen_starts:
            continue
        if footer_at is not None and start >= footer_at:
            continue
        raw_heading = (m.group(2) or "").strip()
        if _is_denied(raw_heading, lex):
            continue
        mapped = _fuzzy_map(raw_heading, alias_to_title)
        if mapped:
            title = mapped
            source = "generic_mapped"
        else:
            title = raw_heading.strip().title()
            source = "generic_unmapped"
            warnings.append(f"Unmapped heading: {raw_heading}")
        seen_starts.add(start)
        matches.append(
            HeadingMatch(title=title, start_char=start, raw_heading=raw_heading, source=source)
        )

    matches.sort(key=lambda h: h.start_char)
    return matches, warnings


def partition_sections(
    raw_note: str,
    matches: list[HeadingMatch],
    *,
    preamble_before_first: bool = True,
) -> list[tuple[str, int, int]]:
    if not matches:
        return [("Full Note", 0, len(raw_note))]

    sections: list[tuple[str, int, int]] = []
    if preamble_before_first and matches[0].start_char > 0:
        sections.append(("Preamble", 0, matches[0].start_char))

    for i, match in enumerate(matches):
        end_char = matches[i + 1].start_char if i + 1 < len(matches) else len(raw_note)
        sections.append((match.title, match.start_char, end_char))

    return sections


def assign_section_ids(sections: list[tuple[str, int, int]]) -> list[StoredNoteSection]:
    return [
        StoredNoteSection(id=f"sec-{i + 1:03d}", title=title, startChar=start, endChar=end)
        for i, (title, start, end) in enumerate(sections)
    ]


def quality_warnings(
    raw_note: str,
    sections: list[StoredNoteSection],
    lexicon: dict[str, Any] | None = None,
) -> list[str]:
    lex = lexicon or load_lexicon()
    warnings: list[str] = []
    n = len(raw_note)
    min_chars = int(lex.get("minNoteCharsForMultiSectionWarning") or 1500)

    if len(sections) == 1 and n >= min_chars:
        warnings.append(f"Single section on long note ({n} chars)")

    if len(sections) == 1 and sections[0].title in ("Preamble", "Full Note"):
        warnings.append("No clinical headings detected")

    return warnings


def detect_sections_rules(
    raw_note: str,
    lexicon: dict[str, Any] | None = None,
) -> tuple[list[StoredNoteSection], list[str]]:
    """Detect sections on raw note; returns (sections, warnings)."""
    if not raw_note:
        return [], []

    lex = lexicon or load_lexicon()
    matches, match_warnings = collect_heading_matches(raw_note, lex)
    partitioned = partition_sections(
        raw_note,
        matches,
        preamble_before_first=bool(lex.get("preambleBeforeFirst", True)),
    )
    sections = assign_section_ids(partitioned)
    warnings = match_warnings + quality_warnings(raw_note, sections, lex)
    return sections, warnings
