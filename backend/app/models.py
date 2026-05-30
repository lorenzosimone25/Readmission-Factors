import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(32), default="reviewer")  # reviewer | admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    assignments: Mapped[list["Assignment"]] = relationship(back_populates="user")
    annotations: Mapped[list["Annotation"]] = relationship(back_populates="user")


class Case(Base):
    __tablename__ = "cases"

    row_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    patient_identifier: Mapped[str] = mapped_column(String(128), default="")
    subject_id: Mapped[str] = mapped_column(String(64), default="")
    index_hadm_id: Mapped[str] = mapped_column(String(64), default="")
    readmit_hadm_id: Mapped[str] = mapped_column(String(64), default="")
    index_primary_icd_code: Mapped[str] = mapped_column(String(32), default="")
    days_to_readmit: Mapped[int] = mapped_column(Integer, default=0)
    readmit_has_icu: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    index_discharge_summary: Mapped[str] = mapped_column(Text, default="")
    readmit_discharge_summary: Mapped[str] = mapped_column(Text, default="")
    index_discharge_summary_formatted: Mapped[str] = mapped_column(Text, default="")
    readmit_discharge_summary_formatted: Mapped[str] = mapped_column(Text, default="")
    index_note_sections: Mapped[list] = mapped_column(JSONB, default=list)
    readmit_note_sections: Mapped[list] = mapped_column(JSONB, default=list)
    note_formatting_meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    note_canonical_version: Mapped[str] = mapped_column(String(32), default="raw_v0")
    note_enrichment_version: Mapped[str] = mapped_column(String(64), default="")
    note_version_hash: Mapped[str] = mapped_column(String(128), default="")

    assignments: Mapped[list["Assignment"]] = relationship(back_populates="case")
    annotations: Mapped[list["Annotation"]] = relationship(back_populates="case")


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("user_id", "row_id", name="uq_assignment_user_case"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    row_id: Mapped[str] = mapped_column(String(128), ForeignKey("cases.row_id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(32), default="not_started")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="assignments")
    case: Mapped["Case"] = relationship(back_populates="assignments")


class Annotation(Base):
    __tablename__ = "annotations"
    __table_args__ = (UniqueConstraint("user_id", "row_id", name="uq_annotation_user_case"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    row_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("cases.row_id", ondelete="CASCADE"), primary_key=True
    )
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    note_version_hash: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(32), default="not_started")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="annotations")
    case: Mapped["Case"] = relationship(back_populates="annotations")
