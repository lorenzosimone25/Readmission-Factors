/**
 * Export contract (publication v1) — UI-backed fields only.
 *
 * Produced by prepareAnnotationForExport() before download.
 *
 * Top-level: caseId, caseMetadata?, reviewerId, noteVersionHash, status, createdAt, updatedAt
 * - noteCanonical: "raw_v0" — offsets are always on raw discharge text
 * - noteEnrichmentVersion?: enrichment revision (sections-rules-v1, etc.)
 * - sectionMetaSource?: "stored" | "detected" | "unknown"
 * - noteVersions?: { index, readmission } (per-note hashes on raw text)
 * - factorSectionSummary?: derived per-factor sectionIds/sectionTitles from finalized spans
 * - caseClinicalSummary?: { readmissionDiagnoses, readmissionDiagnosesUncertain,
 *     readmissionSymptoms, readmissionSymptomsUncertain, overallConfidence }
 * - evidenceGroups[]: finalized groups only { id, label, color, finalizedFactorId, note, createdAt }
 * - evidenceSpans[]: finalized spans { id, caseId, noteType, groupId, factorId, sectionTitle, sectionId?, startChar, endChar, selectedText, createdAt }
 * - factors[]: { id, label, role, confidence, note, evidenceSpanIds[] }
 *
 * Omitted from export (not collected in UI): modifiability, foreseeableFromIndexDischarge, rationale.
 * Omitted: unfinalized evidence groups and their spans.
 *
 * noteType on spans: "index_hf" | "readmission" (offsets are per-note, not global).
 */

export type ExportContractVersion = 'readmission-annotation-export-v1';
