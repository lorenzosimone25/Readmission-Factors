from app.models import Annotation, Assignment, Case
from app.schemas import QueueItemOut


def estimate_remaining_tasks(payload: dict | None, status: str) -> int:
    if status == "submitted":
        return 0
    if not payload or status == "not_started":
        return 3
    groups = payload.get("evidence_groups") or payload.get("evidenceGroups") or []
    spans = payload.get("evidence_spans") or payload.get("evidenceSpans") or []
    factors = payload.get("factors") or []
    if status == "draft" and spans:
        incomplete = 0
        for group in groups:
            gid = group.get("id")
            group_spans = [s for s in spans if s.get("groupId") == gid or s.get("group_id") == gid]
            if not group_spans:
                continue
            if not group.get("finalizedFactorId") and not group.get("finalized_factor_id"):
                incomplete += 1
        has_primary = any(f.get("role") == "primary" for f in factors)
        if not has_primary:
            incomplete += 1
        return max(incomplete, 1) if incomplete else 0
    return 2


def case_to_metadata(case: Case) -> dict:
    return {
        "row_id": case.row_id,
        "patient_identifier": case.patient_identifier,
        "subject_id": case.subject_id,
        "index_hadm_id": case.index_hadm_id,
        "readmit_hadm_id": case.readmit_hadm_id,
        "index_primary_icd_code": case.index_primary_icd_code,
        "days_to_readmit": case.days_to_readmit,
        "readmit_has_icu": case.readmit_has_icu,
    }


def build_queue_item(
    case: Case,
    assignment: Assignment,
    annotation: Annotation | None,
) -> QueueItemOut:
    status = assignment.status
    payload = annotation.payload if annotation else None
    if annotation and annotation.status:
        status = annotation.status
    return QueueItemOut(
        **case_to_metadata(case),
        annotation_status=status,
        estimated_tasks=estimate_remaining_tasks(payload, status),
    )
