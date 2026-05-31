import { normalizeCaseClinicalSummary } from '@/features/readmission/lib/caseClinicalSummary';
import { normalizeFactorRole } from '@/features/readmission/lib/vocabLabels';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceSpan,
  FactorConfidence,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

function normalizeConfidence(value: unknown): FactorConfidence {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  if (value === 'low') return 2;
  if (value === 'medium') return 3;
  if (value === 'high') return 4;
  return 3;
}

function normalizeSpanNoteType(noteType: unknown): EvidenceSpan['noteType'] {
  if (noteType === 'index_hf' || noteType === 'readmission') return noteType;
  return 'readmission';
}

function normalizeFactor(f: ReadmissionFactor & { domain?: unknown }): ReadmissionFactor {
  const { domain: _domain, ...rest } = f;
  return {
    ...rest,
    note: f.note ?? '',
    role: normalizeFactorRole(f.role as string),
    confidence: normalizeConfidence(f.confidence),
  };
}

/** Backfill fields added after earlier drafts were saved. */
export function normalizeAnnotation(
  annotation: ClinicianReadmissionAnnotation,
): ClinicianReadmissionAnnotation {
  return {
    ...annotation,
    evidenceGroups: annotation.evidenceGroups.map((g) => ({
      ...g,
      note: g.note ?? '',
    })),
    factors: annotation.factors.map((f) => normalizeFactor(f as ReadmissionFactor & { domain?: unknown })),
    evidenceSpans: annotation.evidenceSpans.map((sp) => ({
      ...sp,
      noteType: normalizeSpanNoteType(sp.noteType),
    })),
    caseClinicalSummary: normalizeCaseClinicalSummary(annotation.caseClinicalSummary),
  };
}

function storageKey(caseId: string, reviewerId: string): string {
  return `readmission-annotation:${caseId}:${reviewerId}`;
}

export function loadDraftRawFromStorage(
  caseId: string,
  reviewerId: string,
): ClinicianReadmissionAnnotation | null {
  try {
    const raw = localStorage.getItem(storageKey(caseId, reviewerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClinicianReadmissionAnnotation;
    if (!parsed.evidenceGroups?.length) return null;
    return normalizeAnnotation(parsed);
  } catch {
    return null;
  }
}

export function loadDraftFromStorage(
  caseId: string,
  reviewerId: string,
  noteVersionHash: string,
): ClinicianReadmissionAnnotation | null {
  try {
    const raw = localStorage.getItem(storageKey(caseId, reviewerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClinicianReadmissionAnnotation;
    if (parsed.noteVersionHash !== noteVersionHash) return null;
    if (!parsed.evidenceGroups?.length) return null;
    return normalizeAnnotation(parsed);
  } catch {
    return null;
  }
}

export function saveDraftToStorage(annotation: ClinicianReadmissionAnnotation): void {
  try {
    localStorage.setItem(
      storageKey(annotation.caseId, annotation.reviewerId),
      JSON.stringify(annotation),
    );
  } catch {
    // quota or private mode — ignore
  }
}

export function clearDraftFromStorage(caseId: string, reviewerId: string): void {
  try {
    localStorage.removeItem(storageKey(caseId, reviewerId));
  } catch {
    // ignore
  }
}
