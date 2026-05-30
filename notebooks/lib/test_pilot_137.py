"""Pilot case 137 acceptance checks (rules-first section labeling)."""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path

LIB_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(LIB_DIR))

from note_polish import build_case_update, build_run_record, label_case_pair  # noqa: E402

CASE_137_STYLE_INDEX = """Name:  [**Known lastname 5378**], [**Known firstname **]                       Unit No:  [**Numeric Identifier 5379**]

Admission Date:  [**2117-3-29**]     Discharge Date:  [**2145-4-23**]

Date of Birth:  [**2067-11-11**]       Sex:  F

Service:  MEDICINE

Chief Complaint:
Dyspnea and chest pain.

History of Present Illness:
68 year old woman with history of systolic heart failure who presented with worsening dyspnea.

Past Medical History:
Hypertension, diabetes mellitus type 2, chronic kidney disease.

Social History:
Former smoker, lives with daughter.

Family History: Mother with CAD. Father with hypertension.

Allergies:
Penicillin - rash.

Medications on Admission:
Furosemide 40mg daily, Lisinopril 10mg daily.

Physical Exam:
VS: T 98.2 BP 110/70 HR 88 RR 18 O2 96% RA
GENERAL: Alert, mild respiratory distress.

Pertinent Results:
WBC 8.2, Hgb 11.1, Cr 1.4, BNP 2200.

Brief Hospital Course:
Patient was admitted for acute on chronic systolic heart failure and treated with IV diuresis.

Discharge Diagnosis:
1. Acute on chronic systolic heart failure
2. Non-ST elevation myocardial infarction

Discharge Condition:
Stable, euvolemic.

Discharge Disposition:
Home with services.

Discharge Medications:
Furosemide 80mg daily, Lisinopril 20mg daily.

Discharge Instructions:
Low sodium diet, daily weights.

Followup Instructions:
Follow up with cardiology in 1 week.
""" + (" Additional clinical detail." * 200)

CASE_137_STYLE_READMIT = """Admission Date:  [**2145-4-27**]       Discharge Date:  [**2145-5-4**]

Date of Birth:   [**2067-11-11**]       Sex:  F

Service:  ACOVE FIRM

Chief Complaint:
Recurrent dyspnea.

History of Present Illness:
Patient readmitted 4 days after discharge with worsening dyspnea.

Brief Hospital Course:
Treated with diuresis and uptitrated GDMT.

Discharge Diagnosis:
Acute on chronic systolic heart failure exacerbation.

Followup Instructions:
Cardiology follow up in 1 week.
"""


class TestPilot137Acceptance(unittest.TestCase):
    def test_synthetic_case_137_meets_section_thresholds(self) -> None:
        index_res, readmit_res, meta = label_case_pair(
            CASE_137_STYLE_INDEX,
            CASE_137_STYLE_READMIT,
        )
        self.assertEqual(index_res.section_source, "rules")
        self.assertGreaterEqual(len(index_res.sections), 4)
        index_titles = [s.title for s in index_res.sections]
        self.assertIn("Brief Hospital Course", index_titles)
        self.assertNotEqual(index_titles, ["Preamble"])
        self.assertGreaterEqual(len(readmit_res.sections), 2)

        update = build_case_update(index_res, readmit_res, meta)
        record = build_run_record(
            "137",
            CASE_137_STYLE_INDEX,
            CASE_137_STYLE_READMIT,
            index_res,
            readmit_res,
            meta,
            update,
        )
        self.assertEqual(record["meta"]["prompt_version"], "sections-rules-v1")
        self.assertEqual(record["preview"]["index"]["metrics"]["section_count"], len(index_res.sections))

    @unittest.skipUnless(
        os.getenv("RUN_PILOT_137_SUPABASE") == "true",
        "Set RUN_PILOT_137_SUPABASE=true to fetch live case 137",
    )
    def test_live_case_137_from_supabase(self) -> None:
        try:
            from dotenv import load_dotenv
        except ImportError:
            self.skipTest("python-dotenv not installed")
        load_dotenv(LIB_DIR.parent / ".env")
        from supabase import create_client

        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
        row = sb.table("cases").select("*").eq("row_id", "137").single().execute().data
        index_raw = row.get("index_discharge_summary") or ""
        readmit_raw = row.get("readmit_discharge_summary") or ""

        index_res, readmit_res, _ = label_case_pair(index_raw, readmit_raw)
        self.assertGreaterEqual(len(index_res.sections), 4)
        self.assertGreaterEqual(len(readmit_res.sections), 2)


def write_pilot_preview(out_dir: Path | None = None) -> Path:
    index_res, readmit_res, meta = label_case_pair(
        CASE_137_STYLE_INDEX,
        CASE_137_STYLE_READMIT,
    )
    update = build_case_update(index_res, readmit_res, meta)
    record = build_run_record(
        "137",
        CASE_137_STYLE_INDEX,
        CASE_137_STYLE_READMIT,
        index_res,
        readmit_res,
        meta,
        update,
    )
    run_dir = out_dir or (LIB_DIR.parent / "polish_runs" / "pilot_137_validation")
    run_dir.mkdir(parents=True, exist_ok=True)
    out_path = run_dir / "pilot_137.json"
    out_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--write-preview":
        path = write_pilot_preview()
        print("Wrote", path)
    else:
        unittest.main()
