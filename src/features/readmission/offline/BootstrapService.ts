import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { migrateLocalStorageShadows } from '@/features/readmission/offline/localStorageMigration';
import type { BootstrapProgress } from '@/features/readmission/offline/localTypes';
import {
  putAssignment,
  putCase,
  seedWorkingAnnotation,
  setBootstrapMeta,
  getBootstrapMeta,
} from '@/features/readmission/offline/localStores';

const BOOTSTRAP_CONCURRENCY = 5;

export type BootstrapListener = (progress: BootstrapProgress) => void;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      const item = items[i]!;
      results[i] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function runBootstrap(
  userId: string,
  onProgress?: BootstrapListener,
): Promise<void> {
  if (!hasReadmissionBackend()) return;
  if (!navigator.onLine) return;

  await migrateLocalStorageShadows();

  onProgress?.({ done: 0, total: 1, phase: 'assignments' });
  const summaries = await readmissionApi.listCaseSummaries();
  const total = summaries.length;

  for (const item of summaries) {
    await putAssignment({
      ...item,
      pendingSync: false,
    });
  }

  onProgress?.({ done: 0, total, phase: 'cases' });

  let done = 0;
  let cohortHash: string | undefined;
  await mapPool(summaries, BOOTSTRAP_CONCURRENCY, async (item) => {
    const readmissionCase = await readmissionApi.loadCase(item.rowId);
    if (readmissionCase) {
      await putCase(readmissionCase);
      if (!cohortHash) cohortHash = readmissionCase.noteVersionHash;
      const annotation = await readmissionApi.loadAnnotation(
        item.rowId,
        userId,
        readmissionCase.noteVersionHash,
      );
      if (annotation && annotation.noteVersionHash === readmissionCase.noteVersionHash) {
        await seedWorkingAnnotation(annotation, { pendingSync: false });
      }
    }

    done += 1;
    onProgress?.({ done, total, phase: 'cases' });
  });

  await setBootstrapMeta({
    userId,
    lastBootstrapAt: new Date().toISOString(),
    cohortNoteVersionHash: cohortHash,
  });
}

export async function needsBootstrap(userId: string): Promise<boolean> {
  if (!hasReadmissionBackend()) return false;
  const meta = await getBootstrapMeta();
  if (!meta) return true;
  if (meta.userId !== userId) return true;
  return false;
}
