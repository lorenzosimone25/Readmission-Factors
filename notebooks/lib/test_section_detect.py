"""Unit tests for rules-first section detection."""

from __future__ import annotations

import unittest

from section_detect import collect_heading_matches, detect_sections_rules, load_lexicon


MIMIC_STYLE_NOTE = """Name:  [**Known lastname 5378**], [**Known firstname **]

Admission Date:  [**2117-3-29**]     Discharge Date:  [**2145-4-23**]

Chief Complaint:
Chest pain and dyspnea.

History of Present Illness:
68F with HF presented with worsening dyspnea.

Past Medical History:
Hypertension, diabetes.

Family History: Non-contributory.

Physical Exam:
GENERAL: Alert.

Pertinent Results:
WBC 8.2.

Brief Hospital Course:
Patient diuresed and improved.

Discharge Diagnosis:
1. Acute on chronic systolic heart failure

Discharge Instructions:
Low sodium diet.

Followup Instructions:
Follow up with cardiology in 1 week.
"""


class TestSectionDetect(unittest.TestCase):
    def test_inline_family_history(self) -> None:
        sections, _ = detect_sections_rules(MIMIC_STYLE_NOTE)
        titles = [s.title for s in sections]
        self.assertIn("Preamble", titles)
        self.assertIn("Family History", titles)
        self.assertIn("Brief Hospital Course", titles)
        self.assertGreaterEqual(len(sections), 6)

    def test_hospital_course_alias(self) -> None:
        note = "Preamble text.\n\nHOSPITAL COURSE:\nPatient improved.\n\nDISCHARGE DIAGNOSES:\nHF\n"
        sections, _ = detect_sections_rules(note)
        titles = [s.title for s in sections]
        self.assertIn("Brief Hospital Course", titles)
        self.assertIn("Discharge Diagnosis", titles)

    def test_denylist_metadata(self) -> None:
        note = "Name: John\n\nChief Complaint:\nPain\n"
        sections, _ = detect_sections_rules(note)
        titles = [s.title for s in sections]
        self.assertNotIn("Name", titles)
        self.assertIn("Chief Complaint", titles)

    def test_quality_warning_long_single_section(self) -> None:
        note = "A" * 2000
        sections, warnings = detect_sections_rules(note)
        self.assertEqual(len(sections), 1)
        self.assertTrue(any("Single section on long note" in w for w in warnings))

    def test_offsets_cover_full_note(self) -> None:
        sections, _ = detect_sections_rules(MIMIC_STYLE_NOTE)
        self.assertEqual(sections[0].startChar, 0)
        self.assertEqual(sections[-1].endChar, len(MIMIC_STYLE_NOTE))

    def test_collect_matches_lexicon_and_generic(self) -> None:
        lexicon = load_lexicon()
        matches, _ = collect_heading_matches(MIMIC_STYLE_NOTE, lexicon)
        self.assertGreaterEqual(len(matches), 5)


if __name__ == "__main__":
    unittest.main()
