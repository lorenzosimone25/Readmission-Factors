import { BOOTSTRAP_META_KEY } from '@/features/readmission/offline/localTypes';
import type {
  BootstrapMeta,
  LocalAnnotationRecord,
  LocalAssignmentRecord,
  SyncOp,
} from '@/features/readmission/offline/localTypes';
import { getReadmissionOfflineDb } from '@/features/readmission/offline/localDb';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type {
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

export async function putAssignment(record: LocalAssignmentRecord): Promise<void> {
  await getReadmissionOfflineDb().assignments.put(record);
}

export async function putAssignments(records: LocalAssignmentRecord[]): Promise<void> {
  await getReadmissionOfflineDb().assignments.bulkPut(records);
}

export async function listAssignments(): Promise<LocalAssignmentRecord[]> {
  return getReadmissionOfflineDb().assignments.toArray();
}

export async function getAssignment(rowId: string): Promise<LocalAssignmentRecord | undefined> {
  return getReadmissionOfflineDb().assignments.get(rowId);
}

export async function putCase(readmissionCase: ReadmissionCase): Promise<void> {
  await getReadmissionOfflineDb().cases.put({
    ...readmissionCase,
    rowId: readmissionCase.rowId ?? readmissionCase.caseId,
  });
}

export async function getCase(rowId: string): Promise<ReadmissionCase | undefined> {
  return getReadmissionOfflineDb().cases.get(rowId);
}

export async function hasCase(rowId: string): Promise<boolean> {
  const count = await getReadmissionOfflineDb().cases.where('rowId').equals(rowId).count();
  return count > 0;
}

export async function getWorkingAnnotation(rowId: string): Promise<LocalAnnotationRecord | undefined> {
  return getReadmissionOfflineDb().workingAnnotations.get(rowId);
}

export async function putWorkingAnnotation(record: LocalAnnotationRecord): Promise<void> {
  await getReadmissionOfflineDb().workingAnnotations.put({
    ...record,
    rowId: record.rowId || record.annotation.caseId,
  });
}

export async function bumpAndSaveWorkingAnnotation(
  annotation: ClinicianReadmissionAnnotation,
  options: { pendingSync?: boolean; serverUpdatedAt?: string | null } = {},
): Promise<LocalAnnotationRecord> {
  const existing = await getWorkingAnnotation(annotation.caseId);
  const localRevision = (existing?.localRevision ?? 0) + 1;
  const record: LocalAnnotationRecord = {
    rowId: annotation.caseId,
    annotation: normalizeAnnotation(annotation),
    localRevision,
    serverUpdatedAt: options.serverUpdatedAt ?? existing?.serverUpdatedAt ?? null,
    pendingSync:
      options.pendingSync !== undefined
        ? options.pendingSync
        : (existing?.pendingSync ?? false),
    lastLocalWriteAt: new Date().toISOString(),
    noteVersionHash: annotation.noteVersionHash,
  };
  await putWorkingAnnotation(record);
  return record;
}

export async function setWorkingAnnotationPendingSync(
  rowId: string,
  pendingSync: boolean,
): Promise<void> {
  const existing = await getWorkingAnnotation(rowId);
  if (!existing) return;
  await putWorkingAnnotation({ ...existing, pendingSync });
}

export async function appendSyncOp(
  op: Omit<SyncOp, 'id' | 'enqueuedAt'> & { enqueuedAt?: string },
): Promise<number> {
  return getReadmissionOfflineDb().syncOutbox.add({
    ...op,
    enqueuedAt: op.enqueuedAt ?? new Date().toISOString(),
  });
}

export async function listSyncOpsOrdered(): Promise<SyncOp[]> {
  return getReadmissionOfflineDb().syncOutbox.orderBy('enqueuedAt').toArray();
}

export async function listSyncOpsForCase(rowId: string): Promise<SyncOp[]> {
  return getReadmissionOfflineDb().syncOutbox.where('rowId').equals(rowId).sortBy('enqueuedAt');
}

export async function deleteSyncOp(id: number): Promise<void> {
  await getReadmissionOfflineDb().syncOutbox.delete(id);
}

export async function countPendingSyncOps(): Promise<number> {
  return getReadmissionOfflineDb().syncOutbox.count();
}

export async function getBootstrapMeta(): Promise<BootstrapMeta | null> {
  const row = await getReadmissionOfflineDb().syncMeta.get(BOOTSTRAP_META_KEY);
  if (!row) return null;
  const { key: _key, ...meta } = row;
  return meta;
}

export async function setBootstrapMeta(meta: BootstrapMeta): Promise<void> {
  await getReadmissionOfflineDb().syncMeta.put({ key: BOOTSTRAP_META_KEY, ...meta });
}

export async function countCases(): Promise<number> {
  return getReadmissionOfflineDb().cases.count();
}

/** Seed envelope from server or migration; does not bump revision if already present unless force. */
export async function seedWorkingAnnotation(
  annotation: ClinicianReadmissionAnnotation,
  options: {
    serverUpdatedAt?: string | null;
    pendingSync?: boolean;
    force?: boolean;
  } = {},
): Promise<LocalAnnotationRecord> {
  const existing = await getWorkingAnnotation(annotation.caseId);
  if (existing && !options.force) {
    return existing;
  }
  const normalized = normalizeAnnotation(annotation);
  if (!normalized.evidenceGroups.length) {
    normalized.evidenceGroups = createDefaultEvidenceGroups();
  }
  const record: LocalAnnotationRecord = {
    rowId: normalized.caseId,
    annotation: normalized,
    localRevision: existing?.localRevision ?? 0,
    serverUpdatedAt: options.serverUpdatedAt ?? existing?.serverUpdatedAt ?? null,
    pendingSync: options.pendingSync ?? false,
    lastLocalWriteAt: new Date().toISOString(),
    noteVersionHash: normalized.noteVersionHash,
  };
  await putWorkingAnnotation(record);
  return record;
}

export async function clearOfflineDataForUser(): Promise<void> {
  const db = getReadmissionOfflineDb();
  await db.assignments.clear();
  await db.cases.clear();
  await db.workingAnnotations.clear();
  await db.syncOutbox.clear();
  await db.syncMeta.clear();
}
