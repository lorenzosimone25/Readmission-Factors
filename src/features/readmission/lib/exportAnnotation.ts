import { prepareAnnotationForExport } from '@/features/readmission/lib/annotationPayload';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

export function buildExportPayload(annotation: ClinicianReadmissionAnnotation): string {
  const publication = prepareAnnotationForExport(annotation);
  return JSON.stringify(publication, null, 2);
}

export function downloadAnnotationJson(annotation: ClinicianReadmissionAnnotation, filename?: string): void {
  const payload = buildExportPayload(annotation);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `readmission-annotation-${annotation.caseId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
