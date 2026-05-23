import {
  loadDraftFromStorage,
  saveDraftToStorage,
} from '@/features/readmission/lib/annotationStorage';
import { loadCaseByRowId, loadCaseIndex } from '@/features/readmission/data/readmissionDataset';
import { buildQueueItem, type CaseQueueItem } from '@/features/readmission/lib/taskEstimate';
import { MOCK_READMISSION_CASES } from '@/features/readmission/mock/readmissionCases';
import type {
  ClinicianReadmissionAnnotation,
  ReadmissionCase,
  ReadmissionCaseMetadata,
} from '@/features/readmission/types/readmissionAnnotation';

import type { ReadmissionApi } from '@/features/readmission/api/readmissionApiTypes';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_CASES === 'true';

async function mockSummaries(): Promise<CaseQueueItem[]> {
  return MOCK_READMISSION_CASES.map((c) => buildQueueItem(toMetadata(c)));
}

function toMetadata(c: ReadmissionCase): ReadmissionCaseMetadata {
  return {
    rowId: c.rowId,
    patientIdentifier: c.patientIdentifier,
    subjectId: c.subjectId,
    indexHadmId: c.indexHadmId,
    readmitHadmId: c.readmitHadmId,
    indexPrimaryIcdCode: c.indexPrimaryIcdCode,
    daysToReadmission: c.daysToReadmission,
    readmitHasIcu: c.readmitHasIcu,
  };
}

export const readmissionApiLocal: ReadmissionApi = {
  async listCaseSummaries() {
    if (USE_MOCK) return mockSummaries();

    const index = await loadCaseIndex();
    return index.map((meta) => buildQueueItem(meta));
  },

  async loadCase(rowId) {
    if (USE_MOCK) {
      return MOCK_READMISSION_CASES.find((c) => c.rowId === rowId || c.caseId === rowId) ?? null;
    }
    return loadCaseByRowId(rowId);
  },

  async loadAnnotation(caseId, reviewerId, noteVersionHash) {
    return loadDraftFromStorage(caseId, reviewerId, noteVersionHash);
  },

  async saveAnnotation(annotation) {
    saveDraftToStorage(annotation);
  },

  async submitAnnotation(annotation) {
    const next: ClinicianReadmissionAnnotation = {
      ...annotation,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    };
    saveDraftToStorage(next);
    return next;
  },
};
