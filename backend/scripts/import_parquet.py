#!/usr/bin/env python3
"""Import readmit_30d.parquet into Postgres. Run from repo root:

  python backend/scripts/import_parquet.py --path src/data/readmit_30d.parquet
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Case  # noqa: E402
from app.note_hash import compute_case_version_hash  # noqa: E402


def str_val(v) -> str:
    if v is None:
        return ""
    return str(v)


def int_val(v) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def bool_val(v) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    return str(v).lower() in ("true", "1", "yes")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--path",
        type=Path,
        default=ROOT / "src" / "data" / "readmit_30d.parquet",
        help="Path to cohort parquet file",
    )
    args = parser.parse_args()
    if not args.path.is_file():
        raise SystemExit(f"File not found: {args.path}")

    table = pq.read_table(args.path)
    rows = table.to_pylist()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    upserted = 0
    try:
        for row in rows:
            row_id = str_val(row.get("row_id"))
            if not row_id:
                continue
            index_note = str_val(row.get("index_discharge_summary"))
            readmit_note = str_val(row.get("readmit_discharge_summary"))
            case = db.get(Case, row_id)
            if case is None:
                case = Case(row_id=row_id)
                db.add(case)
            case.patient_identifier = str_val(row.get("patient_identifier"))
            case.subject_id = str_val(row.get("subject_id"))
            case.index_hadm_id = str_val(row.get("index_hadm_id"))
            case.readmit_hadm_id = str_val(row.get("readmit_hadm_id"))
            case.index_primary_icd_code = str_val(row.get("index_primary_icd_code"))
            case.days_to_readmit = int_val(row.get("days_to_readmit"))
            case.readmit_has_icu = bool_val(row.get("readmit_has_icu"))
            case.index_discharge_summary = index_note
            case.readmit_discharge_summary = readmit_note
            case.note_version_hash = compute_case_version_hash(index_note, readmit_note)
            upserted += 1
        db.commit()
        print(f"Upserted {upserted} cases from {args.path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
