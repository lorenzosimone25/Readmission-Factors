import { loadDraftRawFromStorage } from '@/features/readmission/lib/annotationStorage';
import { seedWorkingAnnotation } from '@/features/readmission/offline/localStores';

const MIGRATION_FLAG = 'readmission-offline:migrated-localStorage-v1';

export function hasMigratedLocalStorage(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG) === '1';
  } catch {
    return false;
  }
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // ignore
  }
}

/** Import legacy `readmission-annotation:*` keys into IndexedDB (best-effort). */
export async function migrateLocalStorageShadows(): Promise<number> {
  if (hasMigratedLocalStorage()) return 0;
  let imported = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('readmission-annotation:')) continue;
      const parts = key.split(':');
      const caseId = parts[1];
      const reviewerId = parts[2];
      if (!caseId || !reviewerId) continue;
      const ann = loadDraftRawFromStorage(caseId, reviewerId);
      if (!ann) continue;
      const existing = await seedWorkingAnnotation(ann, { pendingSync: false });
      if (existing) imported += 1;
    }
  } catch {
    // quota / private mode
  }
  markMigrated();
  return imported;
}
