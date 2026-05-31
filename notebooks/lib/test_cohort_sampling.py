"""Unit tests for cohort sampling pipeline."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

LIB_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(LIB_DIR))

from cohort_sampling import (  # noqa: E402
    SamplingConfig,
    assign_all_clinicians,
    assign_single_clinician,
    filter_eligible_cohort,
    reserved_unique_row_ids,
    stratified_sample,
)


def _make_row(
    row_id: str,
    postday: float,
    index_note: str,
    readmit_note: str,
) -> dict[str, object]:
    return {
        "row_id": row_id,
        "patient_identifier": f"patient_{row_id}",
        "subject_id": row_id,
        "index_hadm_id": f"idx_{row_id}",
        "readmit_hadm_id": f"rdm_{row_id}",
        "index_primary_icd_code": "I50",
        "readmit_has_icu": False,
        "days_to_readmit": postday,
        "index_discharge_summary": index_note,
        "readmit_discharge_summary": readmit_note,
    }


def _synthetic_cohort(n_per_bin: int = 8, note_len: int = 800) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    filler = "x" * note_len
    idx = 0
    for postday in range(30):
        for _ in range(n_per_bin):
            rows.append(_make_row(str(idx), float(postday), filler, filler))
            idx += 1
    rows.append(_make_row("bad_nan", float("nan"), filler, filler))
    rows.append(_make_row("bad_short", 5.0, "tiny", "tiny"))
    rows.append(_make_row("bad_window", 31.0, filler, filler))
    rows.append(_make_row("bad_missing_note", 10.0, "", filler))
    return pd.DataFrame(rows)


class TestCohortSampling(unittest.TestCase):
    def setUp(self) -> None:
        self.config = SamplingConfig(
            cases_per_clinician=12,
            intersection_size=4,
            random_seed=7,
            note_length_min_percentile=30,
            note_length_max_percentile=90,
            min_combined_note_chars=100,
            postday_bin_width=5,
        )
        self.df = _synthetic_cohort()
        self.eligible, self.exclusion = filter_eligible_cohort(self.df, self.config)

    def test_eligibility_excludes_invalid_rows(self) -> None:
        self.assertGreater(self.exclusion.total_rows, self.exclusion.eligible_rows)
        self.assertIn("bad_nan", self.df["row_id"].tolist())
        self.assertNotIn("bad_nan", set(self.eligible["row_id"]))
        self.assertNotIn("bad_short", set(self.eligible["row_id"]))
        self.assertNotIn("bad_window", set(self.eligible["row_id"]))
        self.assertNotIn("bad_missing_note", set(self.eligible["row_id"]))

    def test_stratified_sample_spreads_across_bins(self) -> None:
        sampled, report = stratified_sample(
            self.eligible,
            n=12,
            seed=99,
            bin_width=self.config.postday_bin_width,
        )
        self.assertEqual(len(sampled), 12)
        achieved = list(report.bin_achieved.values())
        self.assertGreater(len(achieved), 1)
        self.assertLessEqual(max(achieved) - min(achieved), 2)

    def test_assignments_share_intersection_without_unique_overlap(self) -> None:
        intersection_df, _ = stratified_sample(
            self.eligible,
            self.config.intersection_size,
            self.config.random_seed,
            bin_width=self.config.postday_bin_width,
        )
        intersection_ids = intersection_df["row_id"].tolist()
        clinicians = [
            {"email": "a@yale.edu", "password": "welcome", "display_name": "A"},
            {"email": "b@yale.edu", "password": "welcome", "display_name": "B"},
        ]
        splits, _ = assign_all_clinicians(self.eligible, clinicians, intersection_ids, self.config)

        all_unique: set[str] = set()
        for clinician, row_ids in splits:
            self.assertEqual(len(row_ids), self.config.cases_per_clinician)
            self.assertEqual(row_ids[: self.config.intersection_size], intersection_ids)
            unique_ids = row_ids[self.config.intersection_size :]
            overlap = all_unique.intersection(unique_ids)
            self.assertFalse(overlap, msg=f"unique overlap for {clinician['email']}")
            all_unique.update(unique_ids)

    def test_incremental_add_excludes_existing_unique_cases(self) -> None:
        intersection_df, _ = stratified_sample(
            self.eligible,
            self.config.intersection_size,
            self.config.random_seed,
            bin_width=self.config.postday_bin_width,
        )
        intersection_ids = intersection_df["row_id"].tolist()
        clinicians = [
            {"email": "a@yale.edu", "password": "welcome", "display_name": "A"},
            {"email": "b@yale.edu", "password": "welcome", "display_name": "B"},
        ]
        splits, _ = assign_all_clinicians(self.eligible, clinicians, intersection_ids, self.config)

        all_assigned: set[str] = set()
        for _, row_ids in splits:
            all_assigned.update(row_ids)
        reserved = reserved_unique_row_ids(all_assigned, intersection_ids)

        new_clinician = {
            "email": "c@yale.edu",
            "password": "welcome",
            "display_name": "C",
        }
        new_row_ids, _ = assign_single_clinician(
            self.eligible,
            new_clinician,
            intersection_ids,
            self.config,
            reserved_unique_row_ids=reserved,
            clinician_index=len(clinicians),
        )

        self.assertEqual(new_row_ids[: self.config.intersection_size], intersection_ids)
        new_unique = set(new_row_ids[self.config.intersection_size :])
        self.assertFalse(new_unique & reserved)
        for _, row_ids in splits:
            shared = set(new_row_ids) & set(row_ids)
            self.assertEqual(shared, set(intersection_ids))


if __name__ == "__main__":
    unittest.main()
