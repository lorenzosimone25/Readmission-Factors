import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import type {
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

export type ReadmissionApi = {
  listCaseSummaries(): Promise<CaseQueueItem[]>;
  loadCase(rowId: string): Promise<ReadmissionCase | null>;
  loadAnnotation(
    caseId: string,
    reviewerId: string,
    noteVersionHash: string,
  ): Promise<ClinicianReadmissionAnnotation | null>;
  saveAnnotation(annotation: ClinicianReadmissionAnnotation): Promise<void>;
  submitAnnotation(annotation: ClinicianReadmissionAnnotation): Promise<ClinicianReadmissionAnnotation>;
};
