import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { createOfflineFirstAnnotationRepository } from '@/features/readmission/offline/offlineFirstAnnotationRepository';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

export interface AnnotationRepository {
  loadAnnotation(
    caseId: string,
    reviewerId: string,
    noteVersionHash: string,
  ): Promise<ClinicianReadmissionAnnotation | null>;
  saveDraft(annotation: ClinicianReadmissionAnnotation): Promise<void>;
  submit(annotation: ClinicianReadmissionAnnotation): Promise<ClinicianReadmissionAnnotation>;
}

function createLegacyOnlineRepository(): AnnotationRepository {
  return {
    loadAnnotation(caseId, reviewerId, noteVersionHash) {
      return readmissionApi.loadAnnotation(caseId, reviewerId, noteVersionHash);
    },
    async saveDraft(annotation) {
      await readmissionApi.saveAnnotation(annotation);
    },
    submit(annotation) {
      return readmissionApi.submitAnnotation(annotation);
    },
  };
}

export const annotationRepository: AnnotationRepository = hasReadmissionBackend()
  ? createOfflineFirstAnnotationRepository()
  : createLegacyOnlineRepository();
