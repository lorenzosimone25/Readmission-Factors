import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReadmissionOfflineDb } from '@/features/readmission/offline/localDb';
import {
  appendSyncOp,
  bumpAndSaveWorkingAnnotation,
  getWorkingAnnotation,
  listSyncOpsOrdered,
} from '@/features/readmission/offline/localStores';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

vi.mock('@/features/readmission/api/readmissionApi', () => ({
  readmissionApi: {
    saveAnnotation: vi.fn().mockResolvedValue(undefined),
    submitAnnotation: vi.fn().mockImplementation(async (ann: ClinicianReadmissionAnnotation) => ({
      ...ann,
      status: 'submitted' as const,
    })),
  },
}));

vi.mock('@/features/readmission/api/readmissionApiMode', () => ({
  hasReadmissionBackend: () => true,
}));

function sampleAnnotation(caseId: string): ClinicianReadmissionAnnotation {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    caseId,
    reviewerId: 'user-1',
    noteVersionHash: 'hash-1',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    evidenceGroups: createDefaultEvidenceGroups(),
    factors: [],
    evidenceSpans: [
      {
        id: 'span-1',
        caseId,
        noteType: 'readmission',
        groupId: createDefaultEvidenceGroups()[0]!.id,
        factorId: null,
        sectionTitle: 'HPI',
        startChar: 0,
        endChar: 5,
        selectedText: 'hello',
        createdAt: now,
      },
    ],
  };
}

describe('sync outbox ordering', () => {
  beforeEach(() => {
    resetReadmissionOfflineDb();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(async () => {
    const db = resetReadmissionOfflineDb();
    await db.delete();
    vi.unstubAllGlobals();
  });

  it('preserves saveDraft before submit', async () => {
    const ann = sampleAnnotation('case-a');
    await bumpAndSaveWorkingAnnotation(ann);
    const prepared = { ...ann, factors: [] } as never;
    await appendSyncOp({
      type: 'saveDraft',
      rowId: 'case-a',
      localRevision: 1,
      preparedPayload: prepared,
    });
    await appendSyncOp({
      type: 'submit',
      rowId: 'case-a',
      localRevision: 2,
      preparedPayload: prepared,
    });
    const ops = await listSyncOpsOrdered();
    expect(ops.map((o) => o.type)).toEqual(['saveDraft', 'submit']);
  });

  it('checkpoint keeps spans in working store', async () => {
    const ann = sampleAnnotation('case-b');
    await bumpAndSaveWorkingAnnotation(ann);
    const loaded = await getWorkingAnnotation('case-b');
    expect(loaded?.annotation.evidenceSpans).toHaveLength(1);
    expect(loaded?.annotation.evidenceSpans[0]?.selectedText).toBe('hello');
  });
});
