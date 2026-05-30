"""Unit tests for note_polish section labeling (no API calls)."""

from __future__ import annotations

import unittest

from note_polish import (
    PROMPT_VERSION,
    build_case_update,
    case_formatting_meta,
    detect_sections_regex,
    label_note,
    normalize_sections,
    should_skip_case,
    validate_boundary_sections,
)


SAMPLE_NOTE = """Line one.

Chief Complaint:
Chest pain.

Brief Hospital Course:
Patient improved.
"""

INLINE_NOTE = """Header metadata.

Family History: Non-contributory.

HOSPITAL COURSE:
Patient diuresed.

DISCHARGE DIAGNOSES:
Heart failure.
"""


class TestNotePolish(unittest.TestCase):
    def test_regex_detects_headings(self) -> None:
        sections = detect_sections_regex(SAMPLE_NOTE)
        titles = [s.title for s in sections]
        self.assertIn("Preamble", titles)
        self.assertIn("Chief Complaint", titles)
        self.assertIn("Brief Hospital Course", titles)
        self.assertEqual(sections[0].startChar, 0)
        self.assertEqual(sections[-1].endChar, len(SAMPLE_NOTE))

    def test_inline_and_alias_headings(self) -> None:
        sections = detect_sections_regex(INLINE_NOTE)
        titles = [s.title for s in sections]
        self.assertIn("Family History", titles)
        self.assertIn("Brief Hospital Course", titles)
        self.assertIn("Discharge Diagnosis", titles)

    def test_label_note_rules_source(self) -> None:
        result = label_note(SAMPLE_NOTE, "index_hf")
        self.assertEqual(result.section_source, "rules")
        self.assertGreaterEqual(len(result.sections), 3)

    def test_validate_boundary_sections_accepts_valid(self) -> None:
        raw = "abcdefgh"
        sections, warnings = validate_boundary_sections(
            raw,
            [("Part A", 0, 4), ("Part B", 4, 8)],
        )
        self.assertEqual(len(sections), 2)
        self.assertEqual(sections[0].id, "sec-001")
        self.assertEqual(sections[1].endChar, 8)
        self.assertIsInstance(warnings, list)

    def test_normalize_rejects_overlap(self) -> None:
        with self.assertRaises(ValueError):
            normalize_sections(
                "abcdef",
                [("A", 0, 4), ("B", 3, 6)],
            )

    def test_build_case_update_always_includes_sections(self) -> None:
        index = label_note(SAMPLE_NOTE, "index_hf")
        readmit = label_note("short note", "readmission")
        meta = case_formatting_meta(index_result=index, readmit_result=readmit)
        update = build_case_update(index, readmit, meta)
        self.assertEqual(update["note_canonical_version"], "raw_v0")
        self.assertEqual(update["note_enrichment_version"], "sections-rules-v1")
        self.assertTrue(update["index_note_sections"])
        self.assertTrue(update["readmit_note_sections"])
        self.assertNotIn("note_version_hash", update)
        self.assertEqual(meta["model"], "none")

    def test_should_skip_case_when_sections_present(self) -> None:
        row = {
            "note_formatting_meta": {"prompt_version": PROMPT_VERSION},
            "index_note_sections": [{"id": "sec-001", "title": "A", "startChar": 0, "endChar": 1}],
            "readmit_note_sections": [{"id": "sec-001", "title": "B", "startChar": 0, "endChar": 1}],
        }
        self.assertTrue(should_skip_case(row))

    def test_should_not_skip_old_prompt_version(self) -> None:
        row = {
            "note_formatting_meta": {"prompt_version": "sections-on-raw-v1"},
            "index_note_sections": [{"id": "sec-001", "title": "A", "startChar": 0, "endChar": 1}],
            "readmit_note_sections": [{"id": "sec-001", "title": "B", "startChar": 0, "endChar": 1}],
        }
        self.assertFalse(should_skip_case(row))


if __name__ == "__main__":
    unittest.main()
