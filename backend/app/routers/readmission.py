from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Annotation, Assignment, Case, User
from app.note_hash import compute_case_note_versions
from app.schemas import AnnotationOut, QueueItemOut, ReadmissionCaseOut
from app.services.queue import build_queue_item, case_to_metadata

router = APIRouter(prefix="/readmission", tags=["readmission"])


def _get_assignment(db: Session, user_id: UUID, row_id: str) -> Assignment:
    assignment = db.scalar(
        select(Assignment).where(Assignment.user_id == user_id, Assignment.row_id == row_id)
    )
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not assigned to you")
    return assignment


@router.get("/queue", response_model=list[QueueItemOut])
def list_queue(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[QueueItemOut]:
    rows = db.execute(
        select(Assignment, Case, Annotation)
        .join(Case, Case.row_id == Assignment.row_id)
        .outerjoin(
            Annotation,
            (Annotation.row_id == Assignment.row_id) & (Annotation.user_id == user.id),
        )
        .where(Assignment.user_id == user.id)
        .order_by(Assignment.assigned_at)
    ).all()
    return [build_queue_item(case, assignment, annotation) for assignment, case, annotation in rows]


@router.get("/cases/{row_id}", response_model=ReadmissionCaseOut)
def get_case(
    row_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReadmissionCaseOut:
    _get_assignment(db, user.id, row_id)
    case = db.get(Case, row_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    versions = compute_case_note_versions(case.index_discharge_summary, case.readmit_discharge_summary)
    return ReadmissionCaseOut(
        **case_to_metadata(case),
        case_id=case.row_id,
        reviewer_id=str(user.id),
        index_raw_note=case.index_discharge_summary,
        readmission_raw_note=case.readmit_discharge_summary,
        note_version_hash=case.note_version_hash,
        note_versions=versions,
    )


@router.get("/cases/{row_id}/annotation", response_model=AnnotationOut | None)
def get_annotation(
    row_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnnotationOut | None:
    _get_assignment(db, user.id, row_id)
    ann = db.get(Annotation, {"user_id": user.id, "row_id": row_id})
    if ann is None or not ann.payload:
        return None
    return AnnotationOut(annotation=ann.payload)


@router.put("/cases/{row_id}/annotation", response_model=AnnotationOut)
def save_annotation(
    row_id: str,
    body: dict,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnnotationOut:
    assignment = _get_assignment(db, user.id, row_id)
    case = db.get(Case, row_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    note_hash = body.get("noteVersionHash") or body.get("note_version_hash") or case.note_version_hash
    if note_hash != case.note_version_hash:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Note version mismatch")

    status_value = body.get("status", "draft")
    now = datetime.now(timezone.utc)

    ann = db.get(Annotation, {"user_id": user.id, "row_id": row_id})
    if ann is None:
        ann = Annotation(
            user_id=user.id,
            row_id=row_id,
            payload=body,
            note_version_hash=note_hash,
            status=status_value,
            updated_at=now,
        )
        db.add(ann)
    else:
        ann.payload = body
        ann.note_version_hash = note_hash
        ann.status = status_value
        ann.updated_at = now

    assignment.status = status_value
    db.commit()
    db.refresh(ann)
    return AnnotationOut(annotation=ann.payload)


@router.post("/cases/{row_id}/submit", response_model=AnnotationOut)
def submit_annotation(
    row_id: str,
    body: dict,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnnotationOut:
    submitted = {**body, "status": "submitted"}
    result = save_annotation(row_id, submitted, user, db)
    assignment = _get_assignment(db, user.id, row_id)
    assignment.status = "submitted"
    assignment.submitted_at = datetime.now(timezone.utc)
    db.commit()
    return result
