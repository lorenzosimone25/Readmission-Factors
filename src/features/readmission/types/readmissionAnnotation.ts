export type FactorRole = 'primary' | 'contributing';

export type FactorModifiability =
  | 'non_modifiable'
  | 'potentially_modifiable'
  | 'outpatient_monitoring_required'
  | 'system_level'
  | 'uncertain';

export type ForeseeableFromIndex = 'yes' | 'no' | 'uncertain';

export type FactorConfidence = 1 | 2 | 3 | 4 | 5;

export type ClinicalNoteType = 'index_hf' | 'readmission';

export type NoteCanonicalVersion = 'raw_v0' | 'formatted_v1';

export type AnnotationStatus = 'not_started' | 'draft' | 'submitted';

export type EvidenceGroupColor = 'amber' | 'blue' | 'green' | 'violet' | 'slate';

export type EvidenceGroup = {
  id: string;
  label: string;
  color: EvidenceGroupColor;
  finalizedFactorId: string | null;
  note: string;
  createdAt: string;
};

export type ReadmissionFactor = {
  id: string;
  label: string;
  role: FactorRole;
  modifiability: FactorModifiability;
  foreseeableFromIndexDischarge: ForeseeableFromIndex;
  confidence: FactorConfidence;
  rationale: string;
  note: string;
  evidenceSpanIds: string[];
};

export type EvidenceSpan = {
  id: string;
  caseId: string;
  noteType: ClinicalNoteType;
  groupId: string;
  factorId: string | null;
  sectionTitle: string | null;
  /** Stable section id when note sections come from polish pipeline. */
  sectionId?: string | null;
  startChar: number;
  endChar: number;
  selectedText: string;
  createdAt: string;
};

export type CaseNoteVersions = {
  index: string;
  readmission: string;
};

export type SectionMetaSource = 'stored' | 'detected' | 'unknown';

export type ClinicianReadmissionAnnotation = {
  caseId: string;
  caseMetadata?: ReadmissionCaseMetadata;
  reviewerId: string;
  noteVersionHash: string;
  noteVersions?: CaseNoteVersions;
  /** Copy of case note_enrichment_version at save/submit time. */
  noteEnrichmentVersion?: string;
  /** Whether section titles came from stored case sections or client detection. */
  sectionMetaSource?: SectionMetaSource;
  createdAt: string;
  updatedAt: string;
  status: AnnotationStatus;
  evidenceGroups: EvidenceGroup[];
  factors: ReadmissionFactor[];
  evidenceSpans: EvidenceSpan[];
};

export type NoteSection = {
  sectionTitle: string;
  startChar: number;
  endChar: number;
  rawText: string;
};

export type PendingSelection = {
  noteType: ClinicalNoteType;
  startChar: number;
  endChar: number;
  selectedText: string;
  sectionTitle: string | null;
  sectionId?: string | null;
  mappingError: string | null;
} | null;

export type NoteSegment = {
  startChar: number;
  endChar: number;
  text: string;
  sectionTitle: string;
  highlightGroupIds: string[];
  highlightSpanIds: string[];
  isHeadingLine: boolean;
};

export type HighlightClickPayload = {
  spanId: string;
  noteType: ClinicalNoteType;
  anchorRect: DOMRect;
};

export type FactorFinalizePatch = {
  label: string;
  role: FactorRole;
  modifiability: FactorModifiability;
  foreseeableFromIndexDischarge: ForeseeableFromIndex;
  confidence: FactorConfidence;
  rationale: string;
  note: string;
};

/** In-progress factor form state (persisted per group while switching cards). */
export type FactorFormDraft = {
  role: FactorRole | null;
  confidence: FactorConfidence | null;
  note: string;
};

export type ReadmissionCaseMetadata = {
  rowId: string;
  patientIdentifier: string;
  subjectId: string;
  indexHadmId: string;
  readmitHadmId: string;
  indexPrimaryIcdCode: string;
  daysToReadmission: number;
  readmitHasIcu?: boolean;
};

export type StoredNoteSection = {
  id: string;
  title: string;
  startChar: number;
  endChar: number;
};

export type ReadmissionCase = ReadmissionCaseMetadata & {
  caseId: string;
  reviewerId: string;
  /** Immutable source text (audit). */
  indexRawNote: string;
  readmissionRawNote: string;
  /** Ollama-formatted text; used for display and offsets when noteCanonicalVersion is formatted_v1. */
  indexFormattedNote?: string;
  readmissionFormattedNote?: string;
  indexNoteSections?: StoredNoteSection[];
  readmissionNoteSections?: StoredNoteSection[];
  noteCanonicalVersion: NoteCanonicalVersion;
  noteFormattingMeta?: Record<string, unknown>;
  /** Bumps when section enrichment changes; does not affect noteVersionHash. */
  noteEnrichmentVersion?: string;
  noteVersionHash: string;
  noteVersions: CaseNoteVersions;
};
