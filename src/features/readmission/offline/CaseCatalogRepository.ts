import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import type { CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import {
  getCase as getCachedCase,
  hasCase,
  listAssignments,
  putAssignment,
  putCase,
} from '@/features/readmission/offline/localStores';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

export const caseCatalogRepository = {
  async listQueue(options?: { refreshFromNetwork?: boolean }): Promise<CaseQueueItem[]> {
    if (hasReadmissionBackend() && options?.refreshFromNetwork && navigator.onLine) {
      try {
        const summaries = await readmissionApi.listCaseSummaries();
        for (const item of summaries) {
          await putAssignment({ ...item, pendingSync: false });
        }
        return summaries;
      } catch {
        // fall through to cache
      }
    }
    const cached = await listAssignments();
    return cached.map(({ assignedAt: _a, submittedAt: _s, ...item }) => item);
  },

  async getCase(rowId: string, options?: { refreshFromNetwork?: boolean }): Promise<ReadmissionCase | null> {
    if (hasReadmissionBackend() && options?.refreshFromNetwork && navigator.onLine) {
      try {
        const remote = await readmissionApi.loadCase(rowId);
        if (remote) {
          await putCase(remote);
          return remote;
        }
      } catch {
        // fall through to cache
      }
    }

    const cached = await getCachedCase(rowId);
    if (cached) return cached;

    if (!hasReadmissionBackend() || !navigator.onLine) return null;
    const remote = await readmissionApi.loadCase(rowId);
    if (remote) await putCase(remote);
    return remote;
  },

  async isCaseCached(rowId: string): Promise<boolean> {
    return hasCase(rowId);
  },
};
