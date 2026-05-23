import type {
  ReadmissionCase,
  ReadmissionCaseMetadata,
} from '@/features/readmission/types/readmissionAnnotation';

function toMetadata(
  cases: Awaited<typeof import('@/features/readmission/mock/readmissionCases')>['MOCK_READMISSION_CASES'],
): ReadmissionCaseMetadata[] {
  return cases.map((c) => ({
    rowId: c.rowId,
    patientIdentifier: c.patientIdentifier,
    subjectId: c.subjectId,
    indexHadmId: c.indexHadmId,
    readmitHadmId: c.readmitHadmId,
    indexPrimaryIcdCode: c.indexPrimaryIcdCode,
    daysToReadmission: c.daysToReadmission,
    readmitHasIcu: c.readmitHasIcu,
  }));
}

export async function loadCaseIndex(): Promise<ReadmissionCaseMetadata[]> {
  const { MOCK_READMISSION_CASES } = await import('@/features/readmission/mock/readmissionCases');
  return toMetadata(MOCK_READMISSION_CASES);
}

export async function loadCaseByRowId(rowId: string): Promise<ReadmissionCase | null> {
  const { MOCK_READMISSION_CASES } = await import('@/features/readmission/mock/readmissionCases');
  return MOCK_READMISSION_CASES.find((c) => c.rowId === rowId || c.caseId === rowId) ?? null;
}

export function clearDatasetCache(): void {
  // no-op for mock data
}
