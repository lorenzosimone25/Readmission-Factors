"""
Section labeling on raw discharge notes (pre-publish only).

Rules-first detection via section_lexicon.json; warnings only — always upsert sections.
Raw text stays the offset layer.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from section_detect import detect_sections_rules, load_lexicon
from section_types import StoredNoteSection

PROMPT_VERSION = "sections-rules-v1"

# End-of-note tolerance when checking section coverage (chars).
COVERAGE_TAIL_TOLERANCE = 50

CLINICAL_SECTION_HEADINGS = [
    entry["title"] for entry in load_lexicon().get("canonical", [])
]

SectionSource = Literal["rules", "empty"]


@dataclass
class LabelResult:
    sections: list[StoredNoteSection]
    warnings: list[str]
    section_source: SectionSource
    metrics: dict[str, Any] = field(default_factory=dict)
    model_response: dict[str, Any] | None = None


def fnv1a_hash(text: str) -> str:
    hash_val = 0x811C9DC5
    for ch in text:
        hash_val ^= ord(ch)
        hash_val = (hash_val * 0x01000193) & 0xFFFFFFFF
    return f"fnv1a-{hash_val:08x}"


def compute_case_version_hash(index_text: str, readmit_text: str) -> str:
    index_hash = fnv1a_hash(index_text)
    readmit_hash = fnv1a_hash(readmit_text)
    return fnv1a_hash(f"{index_hash}\n---\n{readmit_hash}")


def detect_sections_regex(raw_note: str) -> list[StoredNoteSection]:
    """Backward-compatible wrapper around rules-first detection."""
    sections, _ = detect_sections_rules(raw_note)
    return sections


def _assign_section_ids(sections: list[tuple[str, int, int]]) -> list[StoredNoteSection]:
    return [
        StoredNoteSection(id=f"sec-{i + 1:03d}", title=title, startChar=start, endChar=end)
        for i, (title, start, end) in enumerate(sections)
    ]


def normalize_sections(
    raw_note: str,
    sections: list[tuple[str, int, int]],
    *,
    auto_preamble: bool = True,
) -> tuple[list[StoredNoteSection], list[str]]:
    """Structural validation with optional preamble insertion; returns warnings."""
    warnings: list[str] = []
    n = len(raw_note)
    if n == 0:
        return [], warnings

    sorted_secs = sorted(sections, key=lambda s: s[1])
    normalized: list[tuple[str, int, int]] = []

    for title, start, end in sorted_secs:
        if start < 0 or end > n or start >= end:
            raise ValueError(f"Invalid bounds for section {title!r}: [{start}, {end})")
        if not title.strip():
            raise ValueError("Empty section title")

    if auto_preamble and sorted_secs and sorted_secs[0][1] > 0:
        normalized.append(("Preamble", 0, sorted_secs[0][1]))
        warnings.append(f"Auto-added Preamble for [0, {sorted_secs[0][1]})")

    normalized.extend(sorted_secs)

    for i in range(len(normalized) - 1):
        if normalized[i][2] > normalized[i + 1][1]:
            raise ValueError(
                f"Overlapping sections: {normalized[i][0]} ends at {normalized[i][2]}, "
                f"{normalized[i + 1][0]} starts at {normalized[i + 1][1]}"
            )
        if normalized[i][2] < normalized[i + 1][1]:
            gap = normalized[i + 1][1] - normalized[i][2]
            warnings.append(
                f"Gap of {gap} chars between {normalized[i][0]} and {normalized[i + 1][0]}"
            )

    if normalized[0][1] != 0:
        raise ValueError("First section must start at 0")

    tail = n - normalized[-1][2]
    if tail > COVERAGE_TAIL_TOLERANCE:
        warnings.append(
            f"Last section ends {tail} chars before note end (tolerance {COVERAGE_TAIL_TOLERANCE})"
        )
    elif normalized[-1][2] < n:
        last = normalized[-1]
        normalized[-1] = (last[0], last[1], n)

    covered = sum(end - start for _, start, end in normalized)
    coverage_ratio = covered / n if n else 1.0
    if coverage_ratio < 0.95:
        warnings.append(f"Low coverage ratio {coverage_ratio:.3f}")

    return _assign_section_ids(normalized), warnings


def validate_boundary_sections(
    raw_note: str,
    sections: list[tuple[str, int, int]],
) -> tuple[list[StoredNoteSection], list[str]]:
    return normalize_sections(raw_note, sections, auto_preamble=True)


def label_note(raw_note: str, note_kind: str) -> LabelResult:
    if not raw_note.strip():
        return LabelResult(
            sections=[],
            warnings=["Empty raw note"],
            section_source="empty",
            metrics={"raw_chars": 0, "section_count": 0},
        )

    n = len(raw_note)
    sections, warnings = detect_sections_rules(raw_note)
    metrics: dict[str, Any] = {
        "raw_chars": n,
        "note_kind": note_kind,
        "section_count": len(sections),
    }
    return LabelResult(
        sections=sections,
        warnings=warnings,
        section_source="rules",
        metrics=metrics,
    )


def sections_to_json(sections: list[StoredNoteSection]) -> list[dict[str, Any]]:
    return [
        {"id": s.id, "title": s.title, "startChar": s.startChar, "endChar": s.endChar}
        for s in sections
    ]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def case_formatting_meta(
    *,
    index_result: LabelResult,
    readmit_result: LabelResult,
    prompt_version: str = PROMPT_VERSION,
) -> dict[str, Any]:
    def note_meta(kind: str, res: LabelResult) -> dict[str, Any]:
        return {
            "section_source": res.section_source,
            "warnings": res.warnings,
            "metrics": res.metrics,
            "section_count": len(res.sections),
            "note_kind": kind,
        }

    all_warnings = index_result.warnings + readmit_result.warnings
    return {
        "prompt_version": prompt_version,
        "model": "none",
        "labeled_at": utc_now_iso(),
        "warning_count": len(all_warnings),
        "index": note_meta("index_hf", index_result),
        "readmission": note_meta("readmission", readmit_result),
    }


def enrichment_version_from_meta(formatting_meta: dict[str, Any]) -> str:
    version = formatting_meta.get("prompt_version") or PROMPT_VERSION
    return str(version)


def build_case_update(
    index_res: LabelResult,
    readmit_res: LabelResult,
    formatting_meta: dict[str, Any],
) -> dict[str, Any]:
    enrichment_version = enrichment_version_from_meta(formatting_meta)
    return {
        "index_note_sections": sections_to_json(index_res.sections),
        "readmit_note_sections": sections_to_json(readmit_res.sections),
        "note_formatting_meta": formatting_meta,
        "note_canonical_version": "raw_v0",
        "note_enrichment_version": enrichment_version,
    }


def result_preview(res: LabelResult, raw_note: str, *, preview_chars: int = 200) -> dict[str, Any]:
    section_previews = []
    for s in res.sections[:12]:
        snippet = raw_note[s.startChar : min(s.endChar, s.startChar + preview_chars)]
        section_previews.append(
            {
                "id": s.id,
                "title": s.title,
                "startChar": s.startChar,
                "endChar": s.endChar,
                "preview": snippet,
            }
        )
    return {
        "section_source": res.section_source,
        "warnings": res.warnings,
        "metrics": res.metrics,
        "sections": sections_to_json(res.sections),
        "section_previews": section_previews,
    }


def build_run_record(
    row_id: str,
    index_raw: str,
    readmit_raw: str,
    index_res: LabelResult,
    readmit_res: LabelResult,
    formatting_meta: dict[str, Any],
    update: dict[str, Any],
) -> dict[str, Any]:
    return {
        "row_id": row_id,
        "update": update,
        "meta": formatting_meta,
        "preview": {
            "index": result_preview(index_res, index_raw),
            "readmission": result_preview(readmit_res, readmit_raw),
        },
    }


def label_case_pair(
    index_raw: str,
    readmit_raw: str,
    *,
    client: Any = None,
    model: str | None = None,
    use_llm: bool = False,
) -> tuple[LabelResult, LabelResult, dict[str, Any]]:
    """Label both notes with the rules engine (client/model/use_llm ignored; legacy kwargs)."""
    _ = client, use_llm
    index_res = label_note(index_raw, "index_hf")
    readmit_res = label_note(readmit_raw, "readmission")
    meta = case_formatting_meta(index_result=index_res, readmit_result=readmit_res)
    return index_res, readmit_res, meta


def should_skip_case(row: dict[str, Any]) -> bool:
    meta = row.get("note_formatting_meta") or {}
    if meta.get("prompt_version") != PROMPT_VERSION:
        return False
    index_secs = row.get("index_note_sections") or []
    readmit_secs = row.get("readmit_note_sections") or []
    return bool(index_secs) and bool(readmit_secs)
