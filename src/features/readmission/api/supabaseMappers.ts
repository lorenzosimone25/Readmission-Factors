import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import { estimateRemainingTasks } from '@/features/readmission/lib/taskEstimate';
import { computeCaseNoteVersions } from '@/features/readmission/lib/noteVersionHash';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import type {
  AnnotationStatus,
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';
import type {
  AnnotationRow,
  AssignmentWithCase,
  CaseRow,
} from '@/lib/supabaseClient';

function pickAnnotation(row: AssignmentWithCase): AnnotationRow | null {
  const ann = row.annotations;
  if (!ann) return null;
  return Array.isArray(ann) ? (ann[0] ?? null) : ann;
}

export function caseRowToMetadata(caseRow: CaseRow) {
  return {
    rowId: caseRow.row_id,
    patientIdentifier: caseRow.patient_identifier,
    subjectId: caseRow.subject_id,
    indexHadmId: caseRow.index_hadm_id,
    readmitHadmId: caseRow.readmit_hadm_id,
    indexPrimaryIcdCode: caseRow.index_primary_icd_code,
    daysToReadmission: caseRow.days_to_readmit,
    readmitHasIcu: caseRow.readmit_has_icu ?? undefined,
  };
}

export function caseRowToReadmissionCase(caseRow: CaseRow, reviewerId: string): ReadmissionCase {
  const indexRawNote = caseRow.index_discharge_summary;
  const readmissionRawNote = caseRow.readmit_discharge_summary;
  return {
    ...caseRowToMetadata(caseRow),
    caseId: caseRow.row_id,
    reviewerId,
    indexRawNote,
    readmissionRawNote,
    noteVersionHash: caseRow.note_version_hash,
    noteVersions: computeCaseNoteVersions(indexRawNote, readmissionRawNote),
  };
}

function resolveAnnotationStatus(
  assignmentStatus: string,
  annotation: AnnotationRow | null,
): AnnotationStatus {
  if (annotation?.status) {
    return annotation.status as AnnotationStatus;
  }
  return (assignmentStatus as AnnotationStatus) || 'not_started';
}

export function assignmentToQueueItem(row: AssignmentWithCase): CaseQueueItem {
  const caseRow = row.cases;
  const annotationRow = pickAnnotation(row);
  const metadata = caseRowToMetadata(caseRow);
  const status = resolveAnnotationStatus(row.status, annotationRow);

  let annotation: ClinicianReadmissionAnnotation | null = null;
  if (annotationRow?.payload && Object.keys(annotationRow.payload).length > 0) {
    annotation = normalizeAnnotation(annotationRow.payload as ClinicianReadmissionAnnotation);
  }

  return {
    ...metadata,
    annotationStatus: status,
    estimatedTasks: estimateRemainingTasks(annotation),
  };
}

export function payloadFromAnnotation(annotation: ClinicianReadmissionAnnotation): Record<string, unknown> {
  return { ...annotation };
}
