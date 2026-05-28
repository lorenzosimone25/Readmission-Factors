import type { PublicationAnnotation } from '@/features/readmission/lib/annotationPayload';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

export const BOOTSTRAP_META_KEY = 'bootstrap';

export type LocalAssignmentRecord = CaseQueueItem & {
  assignedAt?: string;
  submittedAt?: string | null;
  pendingSync?: boolean;
};

export type LocalAnnotationRecord = {
  rowId: string;
  annotation: ClinicianReadmissionAnnotation;
  localRevision: number;
  serverUpdatedAt: string | null;
  pendingSync: boolean;
  lastLocalWriteAt: string;
  noteVersionHash: string;
};

export type SyncOpType = 'saveDraft' | 'submit';

export type SyncOp = {
  id?: number;
  type: SyncOpType;
  rowId: string;
  localRevision: number;
  preparedPayload: PublicationAnnotation;
  enqueuedAt: string;
};

export type BootstrapMeta = {
  userId: string;
  lastBootstrapAt: string;
  cohortNoteVersionHash?: string;
};

export type BootstrapProgress = {
  done: number;
  total: number;
  phase: 'assignments' | 'cases';
};
