"""Unit tests for sections parquet export."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

LIB_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(LIB_DIR))

from export_sections_parquet import enrich_row  # noqa: E402


SAMPLE_INDEX = """Chief Complaint:
Pain.

Brief Hospital Course:
Improved.
"""

SAMPLE_READMIT = """Chief Complaint:
Recurrence.

Discharge Diagnosis:
HF.
"""


class TestExportSectionsParquet(unittest.TestCase):
    def test_enrich_row_shape(self) -> None:
        row = enrich_row(SAMPLE_INDEX, SAMPLE_READMIT)
        self.assertIn("note_version_hash", row)
        self.assertTrue(row["note_version_hash"].startswith("fnv1a-"))
        index_sections = json.loads(row["index_note_sections"])
        self.assertGreaterEqual(len(index_sections), 2)
        meta = json.loads(row["note_formatting_meta"])
        self.assertEqual(meta["prompt_version"], "sections-rules-v1")
        self.assertEqual(row["note_enrichment_version"], "sections-rules-v1")


if __name__ == "__main__":
    unittest.main()
