/** Canonical clinical note section headings for regex detection. */
export const CLINICAL_SECTION_HEADINGS = [
  'Chief Complaint',
  'History of Present Illness',
  'Past Medical History',
  'Social History',
  'Family History',
  'Physical Exam',
  'Pertinent Results',
  'Brief Hospital Course',
  'Discharge Diagnosis',
  'Discharge Instructions',
  'Followup Instructions',
] as const;

export type ClinicalSectionHeading = (typeof CLINICAL_SECTION_HEADINGS)[number];

const HEADING_PATTERN = CLINICAL_SECTION_HEADINGS.map((h) =>
  h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
).join('|');

export const SECTION_HEADING_RE = new RegExp(
  `(?:^|\\n)(\\s*)(${HEADING_PATTERN})\\s*:?\\s*(?=\\n|$)`,
  'gi',
);
