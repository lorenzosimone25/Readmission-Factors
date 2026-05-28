import Dexie, { type Table } from 'dexie';

import type {
  BootstrapMeta,
  LocalAnnotationRecord,
  LocalAssignmentRecord,
  SyncOp,
} from '@/features/readmission/offline/localTypes';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

export class ReadmissionOfflineDb extends Dexie {
  assignments!: Table<LocalAssignmentRecord, string>;
  cases!: Table<ReadmissionCase & { rowId: string }, string>;
  workingAnnotations!: Table<LocalAnnotationRecord, string>;
  syncOutbox!: Table<SyncOp, number>;
  syncMeta!: Table<BootstrapMeta & { key: string }, string>;

  constructor(name = 'readmission_offline_v1') {
    super(name);
    this.version(1).stores({
      assignments: 'rowId',
      cases: 'rowId',
      workingAnnotations: 'rowId, pendingSync, noteVersionHash, localRevision',
      syncOutbox: '++id, rowId, enqueuedAt, type',
      syncMeta: 'key',
    });
  }
}

let dbInstance: ReadmissionOfflineDb | null = null;

/** Singleton DB (tests may call `resetReadmissionOfflineDb` to isolate). */
export function getReadmissionOfflineDb(): ReadmissionOfflineDb {
  if (!dbInstance) {
    dbInstance = new ReadmissionOfflineDb();
  }
  return dbInstance;
}

export function resetReadmissionOfflineDb(name?: string): ReadmissionOfflineDb {
  if (dbInstance) {
    void dbInstance.close();
  }
  dbInstance = new ReadmissionOfflineDb(name ?? `readmission_offline_test_${Date.now()}`);
  return dbInstance;
}

export async function deleteReadmissionOfflineDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.delete();
    dbInstance = null;
  } else {
    await Dexie.delete('readmission_offline_v1');
  }
}
