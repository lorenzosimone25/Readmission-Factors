"""Export section enrichment for an entire cohort parquet file."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from note_polish import (
    PROMPT_VERSION,
    build_case_update,
    compute_case_version_hash,
    label_case_pair,
)


def _str_val(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value != value:
        return ""
    return str(value)


def enrich_row(index_raw: str, readmit_raw: str) -> dict[str, Any]:
    index_res, readmit_res, formatting_meta = label_case_pair(index_raw, readmit_raw)
    update = build_case_update(index_res, readmit_res, formatting_meta)
    return {
        "note_version_hash": compute_case_version_hash(index_raw, readmit_raw),
        "index_note_sections": json.dumps(update["index_note_sections"], ensure_ascii=False),
        "readmit_note_sections": json.dumps(update["readmit_note_sections"], ensure_ascii=False),
        "note_formatting_meta": json.dumps(update["note_formatting_meta"], ensure_ascii=False),
        "enrichment_prompt_version": formatting_meta.get("prompt_version", PROMPT_VERSION),
        "note_enrichment_version": update.get("note_enrichment_version", PROMPT_VERSION),
        "labeled_at": formatting_meta.get("labeled_at", ""),
        "index_section_count": len(index_res.sections),
        "readmit_section_count": len(readmit_res.sections),
        "warning_count": formatting_meta.get("warning_count", 0),
    }


def export_sections_parquet(
    source_path: Path,
    output_path: Path,
    *,
    row_limit: int | None = None,
):
    """Label all rows in source parquet and write enrichment parquet."""
    import pandas as pd

    df = pd.read_parquet(source_path)
    id_col = "row_id" if "row_id" in df.columns else df.columns[0]
    rows: list[dict[str, Any]] = []

    subset = df if row_limit is None else df.head(row_limit)
    for _, row in subset.iterrows():
        row_id = _str_val(row.get(id_col))
        index_raw = _str_val(row.get("index_discharge_summary"))
        readmit_raw = _str_val(row.get("readmit_discharge_summary"))
        enriched = enrich_row(index_raw, readmit_raw)
        rows.append({"row_id": row_id, **enriched})

    out_df = pd.DataFrame(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_parquet(output_path, index=False)
    return out_df


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Export section enrichment parquet for full cohort")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("src/data/readmit_30d.parquet"),
        help="Source cohort parquet",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("src/data/readmit_30d_sections.parquet"),
        help="Output enrichment parquet",
    )
    parser.add_argument("--limit", type=int, default=None, help="Optional row limit for testing")
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"Source parquet not found: {args.source}")

    out_df = export_sections_parquet(args.source, args.output, row_limit=args.limit)
    print(f"Wrote {len(out_df)} rows -> {args.output}")


if __name__ == "__main__":
    main()
