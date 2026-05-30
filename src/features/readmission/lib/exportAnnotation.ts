import {
  prepareAnnotationForExport,
  type ExportAnnotation,
} from '@/features/readmission/lib/annotationPayload';
import type { ClinicianReadmissionAnnotation, NoteCanonicalVersion } from '@/features/readmission/types/readmissionAnnotation';

export type ExportEnvelope = ExportAnnotation & {
  noteCanonical: NoteCanonicalVersion;
};

export function buildExportPayload(
  annotation: ClinicianReadmissionAnnotation,
  noteCanonical: NoteCanonicalVersion = 'raw_v0',
): string {
  const publication = prepareAnnotationForExport(annotation);
  const envelope: ExportEnvelope = { ...publication, noteCanonical };
  return JSON.stringify(envelope, null, 2);
}

export function downloadAnnotationJson(
  annotation: ClinicianReadmissionAnnotation,
  options?: { filename?: string; noteCanonical?: NoteCanonicalVersion },
): void {
  const payload = buildExportPayload(annotation, options?.noteCanonical);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options?.filename ?? `readmission-annotation-${annotation.caseId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
