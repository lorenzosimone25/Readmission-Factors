/**
 * Export contract (publication v1) — UI-backed fields only.
 *
 * Produced by prepareAnnotationForExport() before download.
 *
 * Top-level: caseId, caseMetadata?, reviewerId, noteVersionHash, status, createdAt, updatedAt
 * - noteVersions?: { index, readmission } (per-note hashes)
 * - evidenceGroups[]: finalized groups only { id, label, color, finalizedFactorId, note, createdAt }
 * - evidenceSpans[]: spans for finalized groups { id, caseId, noteType, groupId, factorId, sectionTitle, startChar, endChar, selectedText, createdAt }
 * - factors[]: { id, label, role, confidence, note, evidenceSpanIds[] }
 *
 * Omitted from export (not collected in UI): modifiability, foreseeableFromIndexDischarge, rationale.
 * Omitted: unfinalized evidence groups and their spans.
 *
 * noteType on spans: "index_hf" | "readmission" (offsets are per-note, not global).
 */

export type ExportContractVersion = 'readmission-annotation-export-v1';
