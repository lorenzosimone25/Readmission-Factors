import {
  computeCaseNoteVersions,
  computeCaseVersionHash,
} from '@/features/readmission/lib/noteVersionHash';
import { DEFAULT_REVIEWER_ID } from '@/features/readmission/lib/taskEstimate';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

const MOCK_INDEX_HF_NOTE = `DISCHARGE SUMMARY — INDEX HF ADMISSION

Patient: [REDACTED]
Admission Date: 2024-03-06
Discharge Date: 2024-03-10

Chief Complaint:
Acute dyspnea and chest pressure.

History of Present Illness:
68-year-old man with hypertension and type 2 diabetes presented with 3 days of worsening dyspnea on exertion, orthopnea, and bilateral leg swelling.

Discharge Diagnosis:
1. NSTEMI
2. Acute decompensated heart failure`;

const MOCK_READMISSION_NOTE = `DISCHARGE SUMMARY — READMISSION HOSPITALIZATION

Patient: [REDACTED]
Admission Date: 2024-03-18
Discharge Date: 2024-03-22

Chief Complaint:
Recurrent dyspnea and chest discomfort.

Discharge Diagnosis:
1. NSTEMI — recurrent ischemia
2. Acute on chronic heart failure exacerbation`;

const noteVersions = computeCaseNoteVersions(MOCK_INDEX_HF_NOTE, MOCK_READMISSION_NOTE);
const noteVersionHash = computeCaseVersionHash(MOCK_INDEX_HF_NOTE, MOCK_READMISSION_NOTE);

export const MOCK_READMISSION_CASES: ReadmissionCase[] = [
  {
    rowId: 'mock-001',
    caseId: 'mock-001',
    patientIdentifier: 'PAT-MOCK-001',
    subjectId: '100001',
    indexHadmId: '200001',
    readmitHadmId: '200002',
    indexPrimaryIcdCode: 'I21.4',
    daysToReadmission: 12,
    readmitHasIcu: false,
    reviewerId: DEFAULT_REVIEWER_ID,
    indexRawNote: MOCK_INDEX_HF_NOTE,
    readmissionRawNote: MOCK_READMISSION_NOTE,
    noteCanonicalVersion: 'raw_v0',
    noteVersionHash,
    noteVersions,
  },
];
