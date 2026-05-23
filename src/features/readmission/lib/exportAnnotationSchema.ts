/**
 * Export contract for downstream API (frozen v1).
 *
 * Top-level: ClinicianReadmissionAnnotation
 * - caseId, caseMetadata, reviewerId, noteVersionHash, status, createdAt, updatedAt
 * - caseMetadata: { rowId, patientIdentifier, subjectId, indexHadmId, readmitHadmId, indexPrimaryIcdCode, daysToReadmission, readmitHasIcu? }
 * - noteVersions?: { index: string; readmission: string } (per-note hashes)
 * - evidenceGroups[]: { id, label, color, finalizedFactorId, note, createdAt }
 * - evidenceSpans[]: { id, caseId, noteType, groupId, factorId, sectionTitle, startChar, endChar, selectedText, createdAt }
 * - factors[]: { id, label, role, modifiability, foreseeableFromIndexDischarge, confidence, rationale, note?, evidenceSpanIds[] }
 *
 * noteType on spans: "index_hf" | "readmission" (offsets are per-note, not global).
 * noteVersionHash: composite hash of index + readmission raw notes.
 *
 * Factor role: "primary" | "contributing" only.
 * Factor confidence: integer 1–5 (1 very low … 5 very high).
 * Factor note: optional; max 500 words when present.
 *
 * Invariants at submit:
 * - At least one finalized factor with role "primary"
 * - Each finalized factor has confidence 1–5 and non-default label
 * - selectedText === rawNoteFor(noteType).slice(startChar, endChar)
 * - finalized factors link spans via factorId and evidenceSpanIds
 */

export type ExportContractVersion = 'readmission-annotation-v1';
