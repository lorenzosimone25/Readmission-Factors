import type { AnnotationRepository } from '@/features/readmission/api/annotationRepository';
import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { prepareAnnotationForPersist } from '@/features/readmission/lib/annotationPayload';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import {
  appendSyncOp,
  bumpAndSaveWorkingAnnotation,
  getAssignment,
  getWorkingAnnotation,
  listSyncOpsForCase,
  putAssignment,
  seedWorkingAnnotation,
} from '@/features/readmission/offline/localStores';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

async function mergeFromServerIfNeeded(
  caseId: string,
  reviewerId: string,
  noteVersionHash: string,
): Promise<ClinicianReadmissionAnnotation | null> {
  if (!hasReadmissionBackend() || !navigator.onLine) return null;

  const local = await getWorkingAnnotation(caseId);
  if (local?.pendingSync) return local.annotation;

  const serverAnn = await readmissionApi.loadAnnotation(caseId, reviewerId, noteVersionHash);
  if (!serverAnn) return local?.annotation ?? null;

  if (!local) {
    await seedWorkingAnnotation(serverAnn, { pendingSync: false });
    return serverAnn;
  }

  const serverUpdated = serverAnn.updatedAt;
  const localUpdated = local.annotation.updatedAt;
  if (serverUpdated > localUpdated) {
    await seedWorkingAnnotation(serverAnn, { pendingSync: false, force: true });
    return serverAnn;
  }

  return local.annotation;
}

export function createOfflineFirstAnnotationRepository(): AnnotationRepository {
  return {
    async loadAnnotation(caseId, reviewerId, noteVersionHash) {
      if (!hasReadmissionBackend()) {
        return readmissionApi.loadAnnotation(caseId, reviewerId, noteVersionHash);
      }

      const local = await getWorkingAnnotation(caseId);
      if (local && local.noteVersionHash !== noteVersionHash) {
        return null;
      }

      if (local) {
        if (navigator.onLine) {
          const merged = await mergeFromServerIfNeeded(caseId, reviewerId, noteVersionHash);
          if (merged) return normalizeAnnotation(merged);
        }
        return normalizeAnnotation(local.annotation);
      }

      if (navigator.onLine) {
        const server = await mergeFromServerIfNeeded(caseId, reviewerId, noteVersionHash);
        if (server) return normalizeAnnotation(server);
      }

      return null;
    },

    async saveDraft(annotation) {
      if (!hasReadmissionBackend()) {
        await readmissionApi.saveAnnotation(annotation);
        return;
      }

      const prepared = prepareAnnotationForPersist(
        { ...annotation, updatedAt: new Date().toISOString() },
        { mode: 'draft' },
      );

      const record = await bumpAndSaveWorkingAnnotation(annotation, { pendingSync: true });
      await appendSyncOp({
        type: 'saveDraft',
        rowId: annotation.caseId,
        localRevision: record.localRevision,
        preparedPayload: prepared,
      });

      const assignment = await getAssignment(annotation.caseId);
      if (assignment) {
        await putAssignment({
          ...assignment,
          annotationStatus: annotation.status === 'submitted' ? 'draft' : annotation.status,
          pendingSync: true,
        });
      }
    },

    async submit(annotation) {
      if (!hasReadmissionBackend()) {
        return readmissionApi.submitAnnotation(annotation);
      }

      const now = new Date().toISOString();
      const submitted: ClinicianReadmissionAnnotation = {
        ...annotation,
        status: 'submitted',
        updatedAt: now,
      };
      const prepared = prepareAnnotationForPersist(submitted, { mode: 'submit' });

      const record = await bumpAndSaveWorkingAnnotation(submitted, { pendingSync: true });
      await appendSyncOp({
        type: 'submit',
        rowId: annotation.caseId,
        localRevision: record.localRevision,
        preparedPayload: prepared,
      });

      const assignment = await getAssignment(annotation.caseId);
      if (assignment) {
        await putAssignment({
          ...assignment,
          annotationStatus: 'submitted',
          pendingSync: true,
        });
      }

      return normalizeAnnotation(submitted);
    },
  };
}

export async function isAnnotationPendingSync(caseId: string): Promise<boolean> {
  const local = await getWorkingAnnotation(caseId);
  if (local?.pendingSync) return true;
  const ops = await listSyncOpsForCase(caseId);
  return ops.length > 0;
}
