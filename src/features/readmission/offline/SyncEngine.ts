import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import type { PublicationAnnotation } from '@/features/readmission/lib/annotationPayload';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import type { SyncOp } from '@/features/readmission/offline/localTypes';
import {
  deleteSyncOp,
  getWorkingAnnotation,
  listSyncOpsForCase,
  listSyncOpsOrdered,
  putAssignment,
  getAssignment,
  setWorkingAnnotationPendingSync,
  bumpAndSaveWorkingAnnotation,
} from '@/features/readmission/offline/localStores';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

export type SyncResult = {
  flushed: number;
  failed: number;
  lastError: string | null;
};

function preparedToAnnotation(
  prepared: PublicationAnnotation,
  base: ClinicianReadmissionAnnotation,
): ClinicianReadmissionAnnotation {
  return normalizeAnnotation({
    ...base,
    ...prepared,
    factors: prepared.factors.map((f) => ({
      ...f,
      modifiability: 'uncertain',
      foreseeableFromIndexDischarge: 'uncertain',
      rationale: '',
    })),
  } as ClinicianReadmissionAnnotation);
}

async function applyOp(op: SyncOp): Promise<void> {
  const local = await getWorkingAnnotation(op.rowId);
  const base = local?.annotation;
  if (!base) throw new Error(`No local annotation for case ${op.rowId}`);

  const annotation = preparedToAnnotation(op.preparedPayload, base);

  if (op.type === 'saveDraft') {
    await readmissionApi.saveAnnotation(annotation);
  } else {
    const saved = await readmissionApi.submitAnnotation(annotation);
    await bumpAndSaveWorkingAnnotation(saved, {
      pendingSync: false,
      serverUpdatedAt: saved.updatedAt,
    });
    const assignment = await getAssignment(op.rowId);
    if (assignment) {
      await putAssignment({
        ...assignment,
        annotationStatus: 'submitted',
        pendingSync: false,
      });
    }
    return;
  }

  await bumpAndSaveWorkingAnnotation(annotation, {
    pendingSync: false,
    serverUpdatedAt: annotation.updatedAt,
  });
  const assignment = await getAssignment(op.rowId);
  if (assignment) {
    await putAssignment({
      ...assignment,
      annotationStatus: annotation.status,
      pendingSync: false,
    });
  }
}

async function clearPendingIfEmpty(rowId: string): Promise<void> {
  const remaining = await listSyncOpsForCase(rowId);
  if (remaining.length === 0) {
    await setWorkingAnnotationPendingSync(rowId, false);
    const assignment = await getAssignment(rowId);
    if (assignment) {
      await putAssignment({ ...assignment, pendingSync: false });
    }
  }
}

export async function flushSyncOutbox(): Promise<SyncResult> {
  if (!hasReadmissionBackend() || !navigator.onLine) {
    return { flushed: 0, failed: 0, lastError: null };
  }

  const ops = await listSyncOpsOrdered();
  let flushed = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const op of ops) {
    if (op.id == null) continue;
    try {
      await applyOp(op);
      await deleteSyncOp(op.id);
      await clearPendingIfEmpty(op.rowId);
      flushed += 1;
    } catch (e) {
      failed += 1;
      lastError = e instanceof Error ? e.message : 'Sync failed';
      break;
    }
  }

  return { flushed, failed, lastError };
}

export async function countPendingOps(): Promise<number> {
  const ops = await listSyncOpsOrdered();
  return ops.length;
}
