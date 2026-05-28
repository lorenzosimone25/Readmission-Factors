import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetReadmissionOfflineDb } from '@/features/readmission/offline/localDb';
import {
  appendSyncOp,
  bumpAndSaveWorkingAnnotation,
  getWorkingAnnotation,
  listSyncOpsOrdered,
  putAssignment,
  putCase,
  seedWorkingAnnotation,
} from '@/features/readmission/offline/localStores';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import type { ClinicianReadmissionAnnotation, ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

function sampleCase(rowId: string): ReadmissionCase {
  return {
    rowId,
    caseId: rowId,
    patientIdentifier: 'p1',
    subjectId: 's1',
    indexHadmId: 'i1',
    readmitHadmId: 'r1',
    indexPrimaryIcdCode: 'I50',
    daysToReadmission: 10,
    reviewerId: 'user-1',
    indexRawNote: 'Index note text',
    readmissionRawNote: 'Readmit note text',
    noteVersionHash: 'hash-1',
    noteVersions: { index: 'h1', readmission: 'h2' },
  };
}

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
    evidenceSpans: [],
  };
}

describe('readmission offline local stores', () => {
  beforeEach(() => {
    resetReadmissionOfflineDb();
  });

  afterEach(async () => {
    const db = resetReadmissionOfflineDb();
    await db.delete();
  });

  it('round-trips assignment and case', async () => {
    await putAssignment({
      rowId: '42',
      patientIdentifier: 'p',
      subjectId: 's',
      indexHadmId: 'i',
      readmitHadmId: 'r',
      indexPrimaryIcdCode: 'x',
      daysToReadmission: 1,
      annotationStatus: 'draft',
      estimatedTasks: 1,
    });
    await putCase(sampleCase('42'));
    const c = await import('@/features/readmission/offline/localStores').then((m) => m.getCase('42'));
    expect(c?.indexRawNote).toContain('Index');
  });

  it('bumps localRevision monotonically', async () => {
    const ann = sampleAnnotation('99');
    const r1 = await bumpAndSaveWorkingAnnotation(ann);
    const r2 = await bumpAndSaveWorkingAnnotation({ ...ann, updatedAt: '2026-02-01T00:00:00.000Z' });
    expect(r1.localRevision).toBe(1);
    expect(r2.localRevision).toBe(2);
    const loaded = await getWorkingAnnotation('99');
    expect(loaded?.localRevision).toBe(2);
  });

  it('orders sync outbox by enqueuedAt', async () => {
    await appendSyncOp({
      type: 'saveDraft',
      rowId: '1',
      localRevision: 1,
      preparedPayload: sampleAnnotation('1') as never,
      enqueuedAt: '2026-01-01T00:00:01.000Z',
    });
    await appendSyncOp({
      type: 'submit',
      rowId: '1',
      localRevision: 2,
      preparedPayload: sampleAnnotation('1') as never,
      enqueuedAt: '2026-01-01T00:00:02.000Z',
    });
    const ops = await listSyncOpsOrdered();
    expect(ops).toHaveLength(2);
    expect(ops[0]?.type).toBe('saveDraft');
    expect(ops[1]?.type).toBe('submit');
  });

  it('seeds working annotation without bumping revision', async () => {
    const ann = sampleAnnotation('7');
    const seeded = await seedWorkingAnnotation(ann);
    expect(seeded.localRevision).toBe(0);
    const again = await seedWorkingAnnotation({ ...ann, status: 'submitted' });
    expect(again.localRevision).toBe(0);
    expect(again.annotation.status).toBe('draft');
  });
});
