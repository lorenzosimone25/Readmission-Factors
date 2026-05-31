import {
  normalizeCaseClinicalSummary,
  parseCommaSeparatedEntries,
} from '@/features/readmission/lib/caseClinicalSummary';
import { highlightPreviewText } from '@/features/readmission/lib/highlightPreview';
import { CONFIDENCE_SCALE, roleLabel } from '@/features/readmission/lib/vocabLabels';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceGroupColor,
  FactorConfidence,
  FactorRole,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

export type SubmissionReviewFactor = {
  id: string;
  label: string;
  role: FactorRole;
  roleLabel: string;
  confidence: FactorConfidence;
  confidenceLabel: string;
  groupColor: EvidenceGroupColor | null;
  evidencePreviews: string[];
  evidenceOverflowCount: number;
  note?: string;
};

export type SubmissionReviewSummary = {
  caseSetup: {
    diagnoses: string;
    symptoms: string;
    overallConfidence: FactorConfidence | null;
    overallConfidenceLabel: string;
  };
  factors: SubmissionReviewFactor[];
};

const MAX_EVIDENCE_PREVIEWS = 3;

function finalizedFactors(annotation: ClinicianReadmissionAnnotation): ReadmissionFactor[] {
  return annotation.factors.filter((f) =>
    annotation.evidenceGroups.some((g) => g.finalizedFactorId === f.id),
  );
}

function groupColorForFactor(
  annotation: ClinicianReadmissionAnnotation,
  factorId: string,
): EvidenceGroupColor | null {
  const group = annotation.evidenceGroups.find((g) => g.finalizedFactorId === factorId);
  return group?.color ?? null;
}

function confidenceShortLabel(confidence: FactorConfidence): string {
  return CONFIDENCE_SCALE.find((o) => o.value === confidence)?.short ?? String(confidence);
}

function formatCaseSetupList(value: string, uncertain: boolean): string {
  if (uncertain) return 'Uncertain';
  const entries = parseCommaSeparatedEntries(value);
  return entries.length > 0 ? entries.join(', ') : '—';
}

function sortFactors(a: ReadmissionFactor, b: ReadmissionFactor): number {
  if (a.role === 'primary' && b.role !== 'primary') return -1;
  if (b.role === 'primary' && a.role !== 'primary') return 1;
  return a.label.localeCompare(b.label);
}

function evidenceForFactor(
  annotation: ClinicianReadmissionAnnotation,
  factor: ReadmissionFactor,
): { previews: string[]; overflowCount: number } {
  const spans = annotation.evidenceSpans.filter((sp) => sp.factorId === factor.id);
  const previews = spans
    .map((sp) => highlightPreviewText(sp.selectedText))
    .filter(Boolean);
  const overflowCount = Math.max(0, previews.length - MAX_EVIDENCE_PREVIEWS);
  return {
    previews: previews.slice(0, MAX_EVIDENCE_PREVIEWS),
    overflowCount,
  };
}

export function buildSubmissionReviewSummary(
  annotation: ClinicianReadmissionAnnotation | null | undefined,
): SubmissionReviewSummary | null {
  if (!annotation) return null;

  const caseSummary = normalizeCaseClinicalSummary(annotation.caseClinicalSummary);
  const overallConfidence = caseSummary.overallConfidence;

  const factors = finalizedFactors(annotation)
    .slice()
    .sort(sortFactors)
    .map((factor) => {
      const { previews, overflowCount } = evidenceForFactor(annotation, factor);
      return {
        id: factor.id,
        label: factor.label,
        role: factor.role,
        roleLabel: roleLabel(factor.role),
        confidence: factor.confidence,
        confidenceLabel: confidenceShortLabel(factor.confidence),
        groupColor: groupColorForFactor(annotation, factor.id),
        evidencePreviews: previews,
        evidenceOverflowCount: overflowCount,
        note: factor.note?.trim() ? factor.note.trim() : undefined,
      };
    });

  return {
    caseSetup: {
      diagnoses: formatCaseSetupList(
        caseSummary.readmissionDiagnoses,
        caseSummary.readmissionDiagnosesUncertain,
      ),
      symptoms: formatCaseSetupList(
        caseSummary.readmissionSymptoms,
        caseSummary.readmissionSymptomsUncertain,
      ),
      overallConfidence,
      overallConfidenceLabel: overallConfidence
        ? confidenceShortLabel(overallConfidence)
        : '—',
    },
    factors,
  };
}
