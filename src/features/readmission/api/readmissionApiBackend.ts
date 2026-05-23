import { fetchJson, postJson, putJson } from '@/services/api';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import type {
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

import type { ReadmissionApi } from '@/features/readmission/api/readmissionApiTypes';

type QueueItemDto = CaseQueueItem;

type CaseDto = ReadmissionCase;

type AnnotationResponse = { annotation: ClinicianReadmissionAnnotation };

export const readmissionApiBackend: ReadmissionApi = {
  async listCaseSummaries() {
    return fetchJson<QueueItemDto[]>('/readmission/queue');
  },

  async loadCase(rowId) {
    try {
      return await fetchJson<CaseDto>(`/readmission/cases/${encodeURIComponent(rowId)}`);
    } catch {
      return null;
    }
  },

  async loadAnnotation(caseId, _reviewerId, noteVersionHash) {
    const res = await fetchJson<AnnotationResponse | null>(
      `/readmission/cases/${encodeURIComponent(caseId)}/annotation`,
    );
    if (!res?.annotation) return null;
    const ann = normalizeAnnotation(res.annotation);
    if (ann.noteVersionHash !== noteVersionHash) return null;
    return ann;
  },

  async saveAnnotation(annotation) {
    await putJson<AnnotationResponse>(
      `/readmission/cases/${encodeURIComponent(annotation.caseId)}/annotation`,
      annotation,
    );
  },

  async submitAnnotation(annotation) {
    const res = await postJson<AnnotationResponse>(
      `/readmission/cases/${encodeURIComponent(annotation.caseId)}/submit`,
      annotation,
    );
    return normalizeAnnotation(res.annotation);
  },
};
