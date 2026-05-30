from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserPublic(CamelModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: UUID
    email: EmailStr
    display_name: str
    role: str


class CaseMetadataOut(CamelModel):
    row_id: str
    patient_identifier: str
    subject_id: str
    index_hadm_id: str
    readmit_hadm_id: str
    index_primary_icd_code: str
    days_to_readmit: int = Field(serialization_alias="daysToReadmission")
    readmit_has_icu: bool | None = Field(default=None, serialization_alias="readmitHasIcu")


class QueueItemOut(CaseMetadataOut):
    annotation_status: str = Field(serialization_alias="annotationStatus")
    estimated_tasks: int = Field(serialization_alias="estimatedTasks")


class ReadmissionCaseOut(CaseMetadataOut):
    case_id: str = Field(serialization_alias="caseId")
    reviewer_id: str = Field(serialization_alias="reviewerId")
    index_raw_note: str = Field(serialization_alias="indexRawNote")
    readmission_raw_note: str = Field(serialization_alias="readmissionRawNote")
    index_formatted_note: str | None = Field(default=None, serialization_alias="indexFormattedNote")
    readmission_formatted_note: str | None = Field(
        default=None, serialization_alias="readmissionFormattedNote"
    )
    index_note_sections: list[dict] = Field(default_factory=list, serialization_alias="indexNoteSections")
    readmission_note_sections: list[dict] = Field(
        default_factory=list, serialization_alias="readmissionNoteSections"
    )
    note_canonical_version: str = Field(default="raw_v0", serialization_alias="noteCanonicalVersion")
    note_formatting_meta: dict = Field(default_factory=dict, serialization_alias="noteFormattingMeta")
    note_enrichment_version: str = Field(default="", serialization_alias="noteEnrichmentVersion")
    note_version_hash: str = Field(serialization_alias="noteVersionHash")
    note_versions: dict[str, str] = Field(serialization_alias="noteVersions")


class AnnotationOut(BaseModel):
    annotation: dict


class AssignmentCreate(BaseModel):
    user_email: EmailStr
    row_ids: list[str] = Field(min_length=1)


class ImportResult(BaseModel):
    cases_upserted: int
    message: str


class HealthOut(BaseModel):
    status: str
    database: str
