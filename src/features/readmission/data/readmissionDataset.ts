import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import {
  computeCaseNoteVersions,
  computeCaseVersionHash,
} from '@/features/readmission/lib/noteVersionHash';
import { DEFAULT_REVIEWER_ID } from '@/features/readmission/lib/taskEstimate';
import type {
  ReadmissionCase,
  ReadmissionCaseMetadata,
} from '@/features/readmission/types/readmissionAnnotation';

import parquetUrl from '@/data/readmit_30d.parquet?url';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_CASES === 'true';

const INDEX_COLUMNS = [
  'row_id',
  'patient_identifier',
  'subject_id',
  'index_hadm_id',
  'readmit_hadm_id',
  'index_primary_icd_code',
  'readmit_has_icu',
  'days_to_readmit',
] as const;

const NOTE_COLUMNS = ['index_discharge_summary', 'readmit_discharge_summary'] as const;

type ParquetRow = Record<string, unknown>;

let fileBufferPromise: ReturnType<typeof asyncBufferFromUrl> | null = null;
let indexCache: ReadmissionCaseMetadata[] | null = null;
const rowIndexById = new Map<string, number>();

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function int(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function bool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return Boolean(v);
}

function rowToMetadata(row: ParquetRow): ReadmissionCaseMetadata {
  return {
    rowId: str(row.row_id),
    patientIdentifier: str(row.patient_identifier),
    subjectId: str(row.subject_id),
    indexHadmId: str(row.index_hadm_id),
    readmitHadmId: str(row.readmit_hadm_id),
    indexPrimaryIcdCode: str(row.index_primary_icd_code),
    daysToReadmission: int(row.days_to_readmit),
    readmitHasIcu: bool(row.readmit_has_icu),
  };
}

async function getFileBuffer() {
  if (!fileBufferPromise) {
    fileBufferPromise = asyncBufferFromUrl({ url: parquetUrl });
  }
  return fileBufferPromise;
}

export async function loadCaseIndex(): Promise<ReadmissionCaseMetadata[]> {
  if (indexCache) return indexCache;

  const file = await getFileBuffer();
  const rows = (await parquetReadObjects({
    file,
    columns: [...INDEX_COLUMNS],
    compressors,
  })) as ParquetRow[];

  indexCache = rows.map(rowToMetadata).filter((m) => m.rowId);
  indexCache.forEach((m, i) => rowIndexById.set(m.rowId, i));
  return indexCache;
}

export async function loadCaseByRowId(rowId: string): Promise<ReadmissionCase | null> {
  if (USE_MOCK) {
    const { MOCK_READMISSION_CASES } = await import('@/features/readmission/mock/readmissionCases');
    return MOCK_READMISSION_CASES.find((c) => c.rowId === rowId || c.caseId === rowId) ?? null;
  }

  const index = await loadCaseIndex();
  const meta = index.find((m) => m.rowId === rowId);
  if (!meta) return null;

  const rowIdx = rowIndexById.get(rowId);
  if (rowIdx === undefined) return null;

  const file = await getFileBuffer();
  const rows = (await parquetReadObjects({
    file,
    columns: [...INDEX_COLUMNS, ...NOTE_COLUMNS],
    rowStart: rowIdx,
    rowEnd: rowIdx + 1,
    compressors,
  })) as ParquetRow[];

  const row = rows[0];
  if (!row) return null;

  const indexRawNote = str(row.index_discharge_summary);
  const readmissionRawNote = str(row.readmit_discharge_summary);
  const noteVersions = computeCaseNoteVersions(indexRawNote, readmissionRawNote);
  const noteVersionHash = computeCaseVersionHash(indexRawNote, readmissionRawNote);

  return {
    ...meta,
    caseId: meta.rowId,
    reviewerId: DEFAULT_REVIEWER_ID,
    indexRawNote,
    readmissionRawNote,
    noteVersionHash,
    noteVersions,
  };
}

export function clearDatasetCache(): void {
  indexCache = null;
  rowIndexById.clear();
  fileBufferPromise = null;
}
