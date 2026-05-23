from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Assignment, Case, User
from app.schemas import AssignmentCreate

router = APIRouter(prefix="/admin", tags=["admin"])


class AssignAllBody(BaseModel):
    user_email: EmailStr


@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def create_assignments(
    body: AssignmentCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> dict:
    user = db.scalar(select(User).where(User.email == body.user_email.lower()))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    created = 0
    for row_id in body.row_ids:
        case = db.get(Case, row_id)
        if case is None:
            continue
        existing = db.scalar(
            select(Assignment).where(Assignment.user_id == user.id, Assignment.row_id == row_id)
        )
        if existing:
            continue
        db.add(Assignment(user_id=user.id, row_id=row_id, status="not_started"))
        created += 1
    db.commit()
    return {"created": created, "user_id": str(user.id)}


@router.post("/assign-all-to-reviewer", status_code=status.HTTP_201_CREATED)
def assign_all_cases(
    body: AssignAllBody,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> dict:
    user = db.scalar(select(User).where(User.email == body.user_email.lower()))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    cases = db.scalars(select(Case.row_id)).all()
    created = 0
    for row_id in cases:
        existing = db.scalar(
            select(Assignment).where(Assignment.user_id == user.id, Assignment.row_id == row_id)
        )
        if existing:
            continue
        db.add(Assignment(user_id=user.id, row_id=row_id, status="not_started"))
        created += 1
    db.commit()
    return {"created": created, "total_cases": len(cases)}
