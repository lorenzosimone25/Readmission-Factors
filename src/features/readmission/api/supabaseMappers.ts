import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import { estimateReadingMinutes, estimateRemainingTasks } from '@/features/readmission/lib/taskEstimate';
import { computeHashesForCase } from '@/features/readmission/lib/canonicalNote';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import type {
  AnnotationStatus,
  ClinicianReadmissionAnnotation,
  NoteCanonicalVersion,
  ReadmissionCase,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';
import type {
  AnnotationRow,
  AssignmentWithCase,
  CaseRow,
  StoredNoteSectionRow,
} from '@/lib/supabaseClient';

function pickAnnotation(row: AssignmentWithCase): AnnotationRow | null {
  const ann = row.annotations;
  if (!ann) return null;
  return Array.isArray(ann) ? (ann[0] ?? null) : ann;
}

function parseStoredSections(raw: StoredNoteSectionRow[] | null | undefined): StoredNoteSection[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.title === 'string' &&
        typeof s.startChar === 'number' &&
        typeof s.endChar === 'number',
    )
    .map((s) => ({
      id: s.id,
      title: s.title,
      startChar: s.startChar,
      endChar: s.endChar,
    }));
}

function resolveCanonicalVersion(caseRow: CaseRow): NoteCanonicalVersion {
  const v = caseRow.note_canonical_version;
  return v === 'formatted_v1' ? 'formatted_v1' : 'raw_v0';
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
  const noteCanonicalVersion = resolveCanonicalVersion(caseRow);
  const indexFormattedNote = caseRow.index_discharge_summary_formatted ?? '';
  const readmissionFormattedNote = caseRow.readmit_discharge_summary_formatted ?? '';
  const indexNoteSections = parseStoredSections(caseRow.index_note_sections);
  const readmissionNoteSections = parseStoredSections(caseRow.readmit_note_sections);
  const noteEnrichmentVersion =
    caseRow.note_enrichment_version?.trim() ||
    (typeof caseRow.note_formatting_meta?.prompt_version === 'string'
      ? caseRow.note_formatting_meta.prompt_version
      : undefined);

  const draft: ReadmissionCase = {
    ...caseRowToMetadata(caseRow),
    caseId: caseRow.row_id,
    reviewerId,
    indexRawNote,
    readmissionRawNote,
    indexFormattedNote: indexFormattedNote || undefined,
    readmissionFormattedNote: readmissionFormattedNote || undefined,
    indexNoteSections: indexNoteSections.length ? indexNoteSections : undefined,
    readmissionNoteSections: readmissionNoteSections.length ? readmissionNoteSections : undefined,
    noteCanonicalVersion,
    noteFormattingMeta: caseRow.note_formatting_meta ?? undefined,
    noteEnrichmentVersion: noteEnrichmentVersion || undefined,
    noteVersionHash: caseRow.note_version_hash,
    noteVersions: { index: '', readmission: '' },
  };

  const hashes = computeHashesForCase(indexRawNote, readmissionRawNote);

  return {
    ...draft,
    // Offsets always use raw text regardless of legacy formatted columns in DB.
    noteCanonicalVersion: 'raw_v0',
    noteVersionHash: caseRow.note_version_hash || hashes.noteVersionHash,
    noteVersions: hashes.noteVersions,
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
    estimatedReadingMinutes: estimateReadingMinutes(
      (caseRow.index_discharge_summary?.length ?? 0) +
        (caseRow.readmit_discharge_summary?.length ?? 0),
    ),
  };
}

export function payloadFromAnnotation(annotation: ClinicianReadmissionAnnotation): Record<string, unknown> {
  return { ...annotation };
}
