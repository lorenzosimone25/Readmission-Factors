"""Reproducible cohort eligibility filtering and stratified case sampling."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class SamplingConfig:
    cases_per_clinician: int = 30
    intersection_size: int = 10
    random_seed: int = 42
    note_length_min_percentile: float = 30.0
    note_length_max_percentile: float = 90.0
    min_combined_note_chars: int = 400
    postday_bin_width: int = 5
    readmission_window_days: int = 30

    @property
    def unique_per_clinician(self) -> int:
        return self.cases_per_clinician - self.intersection_size

    def validate(self, n_clinicians: int, eligible_count: int) -> None:
        if self.intersection_size > self.cases_per_clinician:
            raise ValueError(
                f"INTERSECTION_SIZE ({self.intersection_size}) must be <= "
                f"CASES_PER_CLINICIAN ({self.cases_per_clinician})"
            )
        if n_clinicians < 1:
            raise ValueError("At least one clinician is required")
        needed = self.intersection_size + n_clinicians * self.unique_per_clinician
        if eligible_count < needed:
            raise ValueError(
                f"Need {needed} eligible cases "
                f"({self.intersection_size} intersection + "
                f"{n_clinicians} × {self.unique_per_clinician} unique) "
                f"but only {eligible_count} pass filters"
            )


@dataclass
class ExclusionReport:
    total_rows: int = 0
    missing_row_id: int = 0
    missing_days_to_readmit: int = 0
    missing_index_note: int = 0
    missing_readmit_note: int = 0
    empty_index_note: int = 0
    empty_readmit_note: int = 0
    out_of_window_postday: int = 0
    below_min_note_length: int = 0
    above_max_note_length: int = 0
    eligible_rows: int = 0
    min_combined_length_threshold: float = 0.0
    max_combined_length_threshold: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SamplingReport:
    requested: int
    selected: int
    seed: int
    postday_bin_width: int
    bin_targets: dict[int, int] = field(default_factory=dict)
    bin_achieved: dict[int, int] = field(default_factory=dict)
    backfill_bins: list[int] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "requested": self.requested,
            "selected": self.selected,
            "seed": self.seed,
            "postday_bin_width": self.postday_bin_width,
            "bin_targets": {str(k): v for k, v in self.bin_targets.items()},
            "bin_achieved": {str(k): v for k, v in self.bin_achieved.items()},
            "backfill_bins": self.backfill_bins,
        }


def _str_val(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and np.isnan(value):
        return ""
    return str(value).strip()


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and np.isnan(value):
        return True
    return False


def compute_postday(days_to_readmit: object, window_days: int = 30) -> int | None:
    if _is_missing(days_to_readmit):
        return None
    try:
        day = int(float(days_to_readmit))
    except (TypeError, ValueError):
        return None
    if day < 0 or day >= window_days:
        return None
    return day


def add_sampling_columns(df: pd.DataFrame, config: SamplingConfig) -> pd.DataFrame:
    out = df.copy()
    out["row_id"] = out["row_id"].map(_str_val)
    out["index_note_clean"] = out["index_discharge_summary"].map(_str_val)
    out["readmit_note_clean"] = out["readmit_discharge_summary"].map(_str_val)
    out["combined_note_len"] = out["index_note_clean"].str.len() + out["readmit_note_clean"].str.len()
    out["postday"] = out["days_to_readmit"].map(
        lambda v: compute_postday(v, config.readmission_window_days)
    )
    out["postday_bin"] = out["postday"].map(
        lambda p: None if p is None else int(p) // config.postday_bin_width
    )
    return out


def filter_eligible_cohort(df: pd.DataFrame, config: SamplingConfig) -> tuple[pd.DataFrame, ExclusionReport]:
    report = ExclusionReport(total_rows=len(df))
    work = add_sampling_columns(df, config)

    mask = pd.Series(True, index=work.index)

    missing_row_id = work["row_id"] == ""
    report.missing_row_id = int(missing_row_id.sum())
    mask &= ~missing_row_id

    missing_days = work["postday"].isna()
    report.missing_days_to_readmit = int(missing_days.sum())
    mask &= ~missing_days

    missing_index = work["index_discharge_summary"].map(_is_missing)
    report.missing_index_note = int(missing_index.sum())
    mask &= ~missing_index

    missing_readmit = work["readmit_discharge_summary"].map(_is_missing)
    report.missing_readmit_note = int(missing_readmit.sum())
    mask &= ~missing_readmit

    empty_index = work["index_note_clean"] == ""
    report.empty_index_note = int(empty_index.sum())
    mask &= ~empty_index

    empty_readmit = work["readmit_note_clean"] == ""
    report.empty_readmit_note = int(empty_readmit.sum())
    mask &= ~empty_readmit

    out_of_window = work["postday"].isna() & ~missing_days
    report.out_of_window_postday = int(out_of_window.sum())

    basic_valid = work.loc[mask].copy()
    if basic_valid.empty:
        report.eligible_rows = 0
        return basic_valid, report

    p_min = float(np.percentile(basic_valid["combined_note_len"], config.note_length_min_percentile))
    p_max = float(np.percentile(basic_valid["combined_note_len"], config.note_length_max_percentile))
    min_threshold = max(config.min_combined_note_chars, p_min)
    max_threshold = p_max
    report.min_combined_length_threshold = min_threshold
    report.max_combined_length_threshold = max_threshold

    length_ok = (basic_valid["combined_note_len"] >= min_threshold) & (
        basic_valid["combined_note_len"] <= max_threshold
    )
    report.below_min_note_length = int((basic_valid["combined_note_len"] < min_threshold).sum())
    report.above_max_note_length = int((basic_valid["combined_note_len"] > max_threshold).sum())

    eligible = basic_valid.loc[length_ok].copy()
    report.eligible_rows = len(eligible)
    return eligible, report


def _bin_counts(df: pd.DataFrame) -> dict[int, int]:
    counts: dict[int, int] = {}
    for bin_id, count in df["postday_bin"].value_counts().items():
        if pd.isna(bin_id):
            continue
        counts[int(bin_id)] = int(count)
    return counts


def _allocate_bin_targets(n: int, available_bins: list[int]) -> dict[int, int]:
    if n <= 0:
        return {}
    if not available_bins:
        raise ValueError("No postday bins available for sampling")
    base = n // len(available_bins)
    remainder = n % len(available_bins)
    targets = {bin_id: base for bin_id in sorted(available_bins)}
    for bin_id in sorted(available_bins)[:remainder]:
        targets[bin_id] += 1
    return targets


def stratified_sample(
    df: pd.DataFrame,
    n: int,
    seed: int,
    *,
    bin_width: int = 5,
    exclude_row_ids: set[str] | None = None,
) -> tuple[pd.DataFrame, SamplingReport]:
    if n <= 0:
        empty = df.iloc[0:0].copy()
        return empty, SamplingReport(requested=0, selected=0, seed=seed, postday_bin_width=bin_width)

    pool = df.copy()
    if exclude_row_ids:
        pool = pool[~pool["row_id"].isin(exclude_row_ids)]
    if len(pool) < n:
        raise ValueError(f"Requested {n} cases but only {len(pool)} available in pool")

    rng = np.random.default_rng(seed)
    available_bins = sorted({int(b) for b in pool["postday_bin"].dropna().unique()})
    targets = _allocate_bin_targets(n, available_bins)
    report = SamplingReport(
        requested=n,
        selected=0,
        seed=seed,
        postday_bin_width=bin_width,
        bin_targets=targets,
    )

    selected_indices: list[Any] = []
    selected_ids: set[str] = set()

    for bin_id, target in targets.items():
        bin_rows = pool[(pool["postday_bin"] == bin_id) & (~pool["row_id"].isin(selected_ids))]
        take = min(target, len(bin_rows))
        if take > 0:
            picks = rng.choice(bin_rows.index.to_numpy(), size=take, replace=False)
            selected_indices.extend(picks.tolist())
            selected_ids.update(pool.loc[picks, "row_id"].tolist())
        report.bin_achieved[bin_id] = take

    remaining = n - len(selected_indices)
    if remaining > 0:
        report.backfill_bins = available_bins
        backfill_pool = pool[~pool["row_id"].isin(selected_ids)]
        if len(backfill_pool) < remaining:
            raise ValueError("Unable to backfill stratified sample — pool exhausted")
        picks = rng.choice(backfill_pool.index.to_numpy(), size=remaining, replace=False)
        selected_indices.extend(picks.tolist())
        for bin_id, count in backfill_pool.loc[picks, "postday_bin"].value_counts().items():
            if pd.isna(bin_id):
                continue
            report.bin_achieved[int(bin_id)] = report.bin_achieved.get(int(bin_id), 0) + int(count)

    sampled = pool.loc[sorted(set(selected_indices))].copy()
    report.selected = len(sampled)
    return sampled, report


def build_intersection_set(
    eligible_df: pd.DataFrame,
    config: SamplingConfig,
) -> tuple[pd.DataFrame, SamplingReport]:
    return stratified_sample(
        eligible_df,
        config.intersection_size,
        config.random_seed,
        bin_width=config.postday_bin_width,
    )


def save_intersection_artifact(
    intersection_df: pd.DataFrame,
    config: SamplingConfig,
    exclusion_report: ExclusionReport,
    sampling_report: SamplingReport,
    *,
    parquet_path: Path,
    manifest_path: Path,
) -> None:
    parquet_path.parent.mkdir(parents=True, exist_ok=True)
    columns = [
        "row_id",
        "patient_identifier",
        "subject_id",
        "index_hadm_id",
        "readmit_hadm_id",
        "days_to_readmit",
        "postday",
        "postday_bin",
        "combined_note_len",
    ]
    export_cols = [c for c in columns if c in intersection_df.columns]
    intersection_df[export_cols].to_parquet(parquet_path, index=False)

    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "config": asdict(config),
        "exclusion_report": exclusion_report.to_dict(),
        "intersection_sampling": sampling_report.to_dict(),
        "intersection_row_ids": intersection_df["row_id"].tolist(),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def load_intersection_artifact(parquet_path: Path) -> tuple[list[str], pd.DataFrame]:
    if not parquet_path.is_file():
        raise FileNotFoundError(f"Intersection artifact not found: {parquet_path}")
    df = pd.read_parquet(parquet_path)
    if "row_id" not in df.columns:
        raise ValueError("Intersection parquet must include row_id column")
    row_ids = df["row_id"].astype(str).tolist()
    return row_ids, df


def validate_intersection_in_pool(intersection_ids: list[str], eligible_df: pd.DataFrame) -> None:
    eligible_ids = set(eligible_df["row_id"].astype(str))
    missing = [row_id for row_id in intersection_ids if row_id not in eligible_ids]
    if missing:
        raise ValueError(
            f"{len(missing)} intersection row_id(s) are not in the current eligible pool: "
            f"{missing[:5]}{'…' if len(missing) > 5 else ''}"
        )


def _clinician_seed(base_seed: int, email: str, index: int) -> int:
    return base_seed + index * 10_000 + (hash(email.lower()) % 1_000_000)


def config_for_clinician(base: SamplingConfig, clinician: dict[str, Any]) -> SamplingConfig:
    """Build a per-clinician sampling config with optional overrides."""
    return SamplingConfig(
        cases_per_clinician=int(clinician.get("cases_per_clinician", base.cases_per_clinician)),
        intersection_size=int(clinician.get("intersection_size", base.intersection_size)),
        random_seed=base.random_seed,
        note_length_min_percentile=base.note_length_min_percentile,
        note_length_max_percentile=base.note_length_max_percentile,
        min_combined_note_chars=base.min_combined_note_chars,
        postday_bin_width=base.postday_bin_width,
        readmission_window_days=base.readmission_window_days,
    )


def reserved_unique_row_ids(all_assigned_row_ids: set[str], intersection_ids: list[str]) -> set[str]:
    """Row IDs assigned to existing clinicians excluding the shared intersection set."""
    return all_assigned_row_ids - set(intersection_ids)


def assign_single_clinician(
    eligible_df: pd.DataFrame,
    clinician: dict[str, Any],
    intersection_ids: list[str],
    config: SamplingConfig,
    *,
    reserved_unique_row_ids: set[str],
    clinician_index: int,
) -> tuple[list[str], dict[str, Any]]:
    """Assign one new clinician: frozen intersection + unique cases not held by others."""
    if len(reserved_unique_row_ids & set(intersection_ids)):
        raise ValueError("Reserved unique row_ids must not include intersection cases")

    intersection_set = set(intersection_ids)
    if len(intersection_set) != len(intersection_ids):
        raise ValueError("Intersection row_ids must be unique")
    if len(intersection_set) != config.intersection_size:
        raise ValueError(
            f"Expected {config.intersection_size} intersection cases, got {len(intersection_set)}"
        )

    config.validate(1, len(eligible_df))
    validate_intersection_in_pool(intersection_ids, eligible_df)

    email = clinician["email"].lower()
    unique_seed = _clinician_seed(config.random_seed, email, clinician_index)
    exclude_row_ids = intersection_set | reserved_unique_row_ids
    unique_df, unique_report = stratified_sample(
        eligible_df,
        config.unique_per_clinician,
        unique_seed,
        bin_width=config.postday_bin_width,
        exclude_row_ids=exclude_row_ids,
    )
    unique_ids = unique_df["row_id"].tolist()

    overlap = set(unique_ids) & exclude_row_ids
    if overlap:
        raise RuntimeError(f"Unique assignment overlap detected for {email}: {sorted(overlap)[:3]}")

    row_ids = intersection_ids + unique_ids
    if len(row_ids) != config.cases_per_clinician:
        raise RuntimeError(
            f"{email}: expected {config.cases_per_clinician} assignments, got {len(row_ids)}"
        )

    report = {
        "email": email,
        "intersection_count": len(intersection_ids),
        "unique_count": len(unique_ids),
        "intersection_row_ids": intersection_ids,
        "unique_row_ids": unique_ids,
        "reserved_unique_excluded": sorted(reserved_unique_row_ids),
        "sampling": unique_report.to_dict(),
    }
    return row_ids, report


def assert_only_intersection_shared(
    new_row_ids: list[str],
    existing_row_ids: set[str],
    intersection_ids: list[str],
    *,
    existing_label: str,
) -> None:
    """Verify overlap with an existing clinician is exactly the intersection set."""
    intersection_set = set(intersection_ids)
    shared = set(new_row_ids) & existing_row_ids
    if shared != intersection_set:
        only_new = shared - intersection_set
        missing = intersection_set - shared
        raise RuntimeError(
            f"Shared cases with {existing_label} must equal intersection only. "
            f"extra_shared={sorted(only_new)[:5]}, missing_intersection={sorted(missing)[:5]}"
        )


def assign_all_clinicians(
    eligible_df: pd.DataFrame,
    clinicians: list[dict[str, str]],
    intersection_ids: list[str],
    config: SamplingConfig,
) -> tuple[list[tuple[dict[str, str], list[str]]], dict[str, Any]]:
    config.validate(len(clinicians), len(eligible_df))

    intersection_set = set(intersection_ids)
    if len(intersection_set) != len(intersection_ids):
        raise ValueError("Intersection row_ids must be unique")
    if len(intersection_set) != config.intersection_size:
        raise ValueError(
            f"Expected {config.intersection_size} intersection cases, got {len(intersection_set)}"
        )

    validate_intersection_in_pool(intersection_ids, eligible_df)

    splits: list[tuple[dict[str, str], list[str]]] = []
    assigned_unique: set[str] = set()
    assignment_reports: list[dict[str, Any]] = []

    for index, clinician in enumerate(clinicians):
        email = clinician["email"].lower()
        unique_seed = _clinician_seed(config.random_seed, email, index)
        unique_df, unique_report = stratified_sample(
            eligible_df,
            config.unique_per_clinician,
            unique_seed,
            bin_width=config.postday_bin_width,
            exclude_row_ids=intersection_set | assigned_unique,
        )
        unique_ids = unique_df["row_id"].tolist()
        overlap = set(unique_ids) & (intersection_set | assigned_unique)
        if overlap:
            raise RuntimeError(f"Unique assignment overlap detected for {email}: {sorted(overlap)[:3]}")

        row_ids = intersection_ids + unique_ids
        if len(row_ids) != config.cases_per_clinician:
            raise RuntimeError(
                f"{email}: expected {config.cases_per_clinician} assignments, got {len(row_ids)}"
            )

        assigned_unique.update(unique_ids)
        splits.append((clinician, row_ids))
        assignment_reports.append(
            {
                "email": email,
                "intersection_count": len(intersection_ids),
                "unique_count": len(unique_ids),
                "unique_row_ids": unique_ids,
                "sampling": unique_report.to_dict(),
            }
        )

    return splits, {
        "intersection_row_ids": intersection_ids,
        "clinicians": assignment_reports,
    }


def union_assigned_rows(eligible_df: pd.DataFrame, splits: list[tuple[dict[str, str], list[str]]]) -> pd.DataFrame:
    all_ids: list[str] = []
    for _, row_ids in splits:
        all_ids.extend(row_ids)
    unique_ids = list(dict.fromkeys(all_ids))
    return eligible_df[eligible_df["row_id"].isin(unique_ids)].copy()
