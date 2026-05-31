"""Supabase admin helpers for cohort setup notebook."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


def fnv1a_hash(text: str) -> str:
    hash_val = 0x811C9DC5
    for ch in text:
        hash_val ^= ord(ch)
        hash_val = (hash_val * 0x01000193) & 0xFFFFFFFF
    return f"fnv1a-{hash_val:08x}"


def compute_case_version_hash(index_raw: str, readmit_raw: str) -> str:
    index_hash = fnv1a_hash(index_raw)
    readmit_hash = fnv1a_hash(readmit_raw)
    return fnv1a_hash(f"{index_hash}\n---\n{readmit_hash}")


def str_val(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value != value:
        return ""
    return str(value)


def int_val(value: object) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def bool_val(value: object) -> bool | None:
    if value is None:
        return None
    if isinstance(value, float) and value != value:
        return None
    if isinstance(value, bool):
        return value
    return str(value).lower() in ("true", "1", "yes")


def table_count(sb: Any, table: str) -> int:
    res = sb.table(table).select("*", count="exact", head=True).execute()
    return int(res.count or 0)


def fetch_all_assignments(sb: Any, *, page_size: int = 1000) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        res = (
            sb.table("assignments")
            .select("user_id,row_id,status")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def fetch_assigned_row_ids(sb: Any) -> set[str]:
    return {str(row["row_id"]) for row in fetch_all_assignments(sb)}


def fetch_assignments_by_user(sb: Any) -> dict[str, set[str]]:
    by_user: dict[str, set[str]] = {}
    for row in fetch_all_assignments(sb):
        user_id = str(row["user_id"])
        by_user.setdefault(user_id, set()).add(str(row["row_id"]))
    return by_user


def count_clinicians_with_assignments(sb: Any) -> int:
    return len(fetch_assignments_by_user(sb))


def ensure_user_not_assigned(sb: Any, email: str) -> None:
    email = email.lower()
    for user in list_all_users(sb):
        if getattr(user, "email", "") and user.email.lower() == email:
            res = (
                sb.table("assignments")
                .select("row_id", count="exact")
                .eq("user_id", user.id)
                .execute()
            )
            if int(res.count or 0) > 0:
                raise RuntimeError(
                    f"{email} already has {res.count} assignments — "
                    "incremental add only supports new clinicians"
                )
            return


def list_all_users(sb: Any) -> list[Any]:
    users: list[Any] = []
    page = 1
    while True:
        res = sb.auth.admin.list_users(page=page, per_page=200)
        batch = getattr(res, "users", res) or []
        if not batch:
            break
        users.extend(batch)
        if len(batch) < 200:
            break
        page += 1
    return users


def fetch_existing_clinician_assignments(sb: Any) -> list[tuple[str, set[str]]]:
    by_user = fetch_assignments_by_user(sb)
    user_email = {
        user.id: user.email.lower()
        for user in list_all_users(sb)
        if getattr(user, "email", "")
    }
    return [
        (user_email.get(user_id, user_id), row_ids)
        for user_id, row_ids in sorted(by_user.items())
    ]


def reset_database(sb: Any, *, dry_run: bool = False) -> dict[str, int]:
    """Delete annotations, assignments, cases, profiles, and auth users."""
    before = {
        "annotations": table_count(sb, "annotations"),
        "assignments": table_count(sb, "assignments"),
        "cases": table_count(sb, "cases"),
        "profiles": table_count(sb, "profiles"),
        "auth_users": len(list_all_users(sb)),
    }
    if dry_run:
        return before

    sb.table("annotations").delete().neq("row_id", "").execute()
    sb.table("assignments").delete().neq("row_id", "").execute()
    sb.table("cases").delete().neq("row_id", "").execute()
    sb.table("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    for user in list_all_users(sb):
        user_id = getattr(user, "id", None)
        if user_id:
            sb.auth.admin.delete_user(user_id)

    after = {
        "annotations": table_count(sb, "annotations"),
        "assignments": table_count(sb, "assignments"),
        "cases": table_count(sb, "cases"),
        "profiles": table_count(sb, "profiles"),
        "auth_users": len(list_all_users(sb)),
    }
    return {"before": before, "after": after}


def dataframe_to_case_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    case_rows: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        index_note = str_val(row.get("index_discharge_summary"))
        readmit_note = str_val(row.get("readmit_discharge_summary"))
        case_rows.append(
            {
                "row_id": str_val(row.get("row_id")),
                "patient_identifier": str_val(row.get("patient_identifier")),
                "subject_id": str_val(row.get("subject_id")),
                "index_hadm_id": str_val(row.get("index_hadm_id")),
                "readmit_hadm_id": str_val(row.get("readmit_hadm_id")),
                "index_primary_icd_code": str_val(row.get("index_primary_icd_code")),
                "days_to_readmit": int_val(row.get("days_to_readmit")),
                "readmit_has_icu": bool_val(row.get("readmit_has_icu")),
                "index_discharge_summary": index_note,
                "readmit_discharge_summary": readmit_note,
                "note_version_hash": compute_case_version_hash(index_note, readmit_note),
            }
        )
    return case_rows


def upsert_cases(sb: Any, df: pd.DataFrame, *, batch_size: int = 20) -> int:
    case_rows = dataframe_to_case_rows(df)
    for i in range(0, len(case_rows), batch_size):
        batch = case_rows[i : i + batch_size]
        sb.table("cases").upsert(batch, on_conflict="row_id").execute()
    return len(case_rows)


def ensure_users_and_profiles(
    sb: Any,
    clinicians: list[dict[str, str]],
) -> dict[str, str]:
    user_ids: dict[str, str] = {}
    existing_users = list_all_users(sb)

    for clinician in clinicians:
        email = clinician["email"].lower()
        match = next(
            (u for u in existing_users if getattr(u, "email", "") and u.email.lower() == email),
            None,
        )
        if match:
            user_id = match.id
        else:
            created = sb.auth.admin.create_user(
                {
                    "email": email,
                    "password": clinician["password"],
                    "email_confirm": True,
                }
            )
            user_id = created.user.id

        user_ids[email] = user_id
        sb.table("profiles").upsert(
            {
                "id": user_id,
                "display_name": clinician["display_name"],
                "role": "reviewer",
            },
            on_conflict="id",
        ).execute()

    return user_ids


def upsert_assignments(
    sb: Any,
    splits: list[tuple[dict[str, str], list[str]]],
    user_ids: dict[str, str],
    *,
    batch_size: int = 50,
) -> tuple[int, list[dict[str, str]]]:
    assignment_rows: list[dict[str, Any]] = []
    manifest: list[dict[str, str]] = []

    for clinician, row_ids in splits:
        email = clinician["email"].lower()
        user_id = user_ids[email]
        for row_id in row_ids:
            assignment_rows.append(
                {
                    "user_id": user_id,
                    "row_id": row_id,
                    "status": "not_started",
                }
            )
            manifest.append({"email": email, "user_id": user_id, "row_id": row_id})

    for i in range(0, len(assignment_rows), batch_size):
        sb.table("assignments").upsert(
            assignment_rows[i : i + batch_size],
            on_conflict="user_id,row_id",
        ).execute()

    return len(assignment_rows), manifest


def write_assignment_manifest(manifest: list[dict[str, str]], path: Path) -> None:
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def append_assignment_manifest(new_entries: list[dict[str, str]], path: Path) -> None:
    existing: list[dict[str, str]] = []
    if path.is_file():
        existing = json.loads(path.read_text(encoding="utf-8"))
    existing.extend(new_entries)
    write_assignment_manifest(existing, path)


def print_verification(sb: Any, clinicians: list[dict[str, str]], user_ids: dict[str, str]) -> None:
    print("Cases in DB:", table_count(sb, "cases"))
    print("Assignments in DB:", table_count(sb, "assignments"))
    for clinician in clinicians:
        email = clinician["email"].lower()
        uid = user_ids[email]
        res = sb.table("assignments").select("row_id", count="exact").eq("user_id", uid).execute()
        print(f"  {email}: {res.count} assignments")
