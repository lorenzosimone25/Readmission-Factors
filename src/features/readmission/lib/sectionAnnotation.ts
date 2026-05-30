import {
  sectionIdAtChar,
  sectionTitleAtCharFromStored,
} from '@/features/readmission/lib/sectionLookup';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceSpan,
  ReadmissionCase,
  SectionMetaSource,
  StoredNoteSection,
} from '@/features/readmission/types/readmissionAnnotation';

export function noteEnrichmentVersionFromCase(
  caseData: Pick<ReadmissionCase, 'noteEnrichmentVersion' | 'noteFormattingMeta'>,
): string | undefined {
  const direct = caseData.noteEnrichmentVersion?.trim();
  if (direct) return direct;
  const metaVersion = caseData.noteFormattingMeta?.prompt_version;
  return typeof metaVersion === 'string' && metaVersion.trim() ? metaVersion : undefined;
}

export function sectionMetaSourceFromCase(
  caseData: Pick<ReadmissionCase, 'indexNoteSections' | 'readmissionNoteSections'>,
): SectionMetaSource {
  if (caseData.indexNoteSections?.length || caseData.readmissionNoteSections?.length) {
    return 'stored';
  }
  return 'detected';
}

function storedSectionsForSpan(
  activeCase: ReadmissionCase,
  span: EvidenceSpan,
): StoredNoteSection[] | undefined {
  return span.noteType === 'index_hf'
    ? activeCase.indexNoteSections
    : activeCase.readmissionNoteSections;
}

/** Resolve missing sectionId from stored case sections (display/export safe). */
export function backfillSpanSectionIds(
  annotation: ClinicianReadmissionAnnotation,
  activeCase: ReadmissionCase,
): ClinicianReadmissionAnnotation {
  let changed = false;
  const evidenceSpans = annotation.evidenceSpans.map((span) => {
    if (span.sectionId) return span;
    const sections = storedSectionsForSpan(activeCase, span);
    if (!sections?.length) return span;
    const sectionId = sectionIdAtChar(sections, span.startChar);
    const sectionTitle = sectionTitleAtCharFromStored(sections, span.startChar);
    if (!sectionId && !sectionTitle) return span;
    changed = true;
    return {
      ...span,
      sectionId: sectionId ?? span.sectionId ?? null,
      sectionTitle: span.sectionTitle ?? sectionTitle,
    };
  });
  return changed ? { ...annotation, evidenceSpans } : annotation;
}

export function annotationSectionEnvelopeFromCase(activeCase: ReadmissionCase): {
  noteEnrichmentVersion?: string;
  sectionMetaSource: SectionMetaSource;
} {
  return {
    noteEnrichmentVersion: noteEnrichmentVersionFromCase(activeCase),
    sectionMetaSource: sectionMetaSourceFromCase(activeCase),
  };
}
