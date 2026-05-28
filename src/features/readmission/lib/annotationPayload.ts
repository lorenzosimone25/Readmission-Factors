import type {
  ClinicianReadmissionAnnotation,
  EvidenceGroup,
  EvidenceSpan,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

export type PersistMode = 'draft' | 'submit';

/** Factor fields collected in the UI (export / persist publication shape). */
export type PublicationFactor = {
  id: string;
  label: string;
  role: ReadmissionFactor['role'];
  confidence: ReadmissionFactor['confidence'];
  note: string;
  evidenceSpanIds: string[];
};

export type PublicationAnnotation = Omit<
  ClinicianReadmissionAnnotation,
  'factors' | 'evidenceGroups' | 'evidenceSpans'
> & {
  factors: PublicationFactor[];
  evidenceGroups: EvidenceGroup[];
  evidenceSpans: EvidenceSpan[];
};

function slimFactor(factor: ReadmissionFactor): PublicationFactor {
  return {
    id: factor.id,
    label: factor.label,
    role: factor.role,
    confidence: factor.confidence,
    note: factor.note ?? '',
    evidenceSpanIds: [...factor.evidenceSpanIds],
  };
}

function finalizedGroups(annotation: ClinicianReadmissionAnnotation): EvidenceGroup[] {
  return annotation.evidenceGroups.filter((g) => g.finalizedFactorId);
}

function spansForFinalized(annotation: ClinicianReadmissionAnnotation): EvidenceSpan[] {
  const finalizedIds = new Set(finalizedGroups(annotation).map((g) => g.id));
  const factorIds = new Set(
    annotation.factors
      .filter((f) => finalizedGroups(annotation).some((g) => g.finalizedFactorId === f.id))
      .map((f) => f.id),
  );
  return annotation.evidenceSpans.filter(
    (sp) => finalizedIds.has(sp.groupId) && (sp.factorId === null || factorIds.has(sp.factorId)),
  );
}

function factorsForFinalized(annotation: ClinicianReadmissionAnnotation): PublicationFactor[] {
  const finalizedFactorIds = new Set(
    finalizedGroups(annotation)
      .map((g) => g.finalizedFactorId)
      .filter((id): id is string => Boolean(id)),
  );
  return annotation.factors.filter((f) => finalizedFactorIds.has(f.id)).map(slimFactor);
}

/**
 * Strip non-UI factor fields and optionally remove in-progress groups for submit persistence.
 */
export function prepareAnnotationForPersist(
  annotation: ClinicianReadmissionAnnotation,
  options: { mode: PersistMode },
): PublicationAnnotation {
  if (options.mode === 'draft') {
    return {
      ...annotation,
      evidenceGroups: annotation.evidenceGroups.map((g) => ({ ...g })),
      evidenceSpans: annotation.evidenceSpans.map((sp) => ({ ...sp })),
      factors: annotation.factors.map(slimFactor),
    };
  }

  const groups = finalizedGroups(annotation);
  const groupIds = new Set(groups.map((g) => g.id));
  const factors = factorsForFinalized(annotation);
  const factorIds = new Set(factors.map((f) => f.id));
  const spans = spansForFinalized(annotation)
    .filter((sp) => groupIds.has(sp.groupId))
    .map((sp) => ({
      ...sp,
      factorId: sp.factorId && factorIds.has(sp.factorId) ? sp.factorId : sp.factorId,
    }))
    .filter((sp) => sp.factorId === null || factorIds.has(sp.factorId));

  return {
    ...annotation,
    status: 'submitted',
    evidenceGroups: groups,
    factors,
    evidenceSpans: spans,
  };
}

/** Download/export shape: finalized factors and linked evidence only. */
export function prepareAnnotationForExport(
  annotation: ClinicianReadmissionAnnotation,
): PublicationAnnotation {
  const prepared = prepareAnnotationForPersist(
    { ...annotation, status: annotation.status === 'submitted' ? 'submitted' : annotation.status },
    { mode: 'submit' },
  );
  return prepared;
}

/** Reopen a submitted annotation for editing (revise workflow). */
export function reopenSubmittedIfNeeded(
  annotation: ClinicianReadmissionAnnotation,
): ClinicianReadmissionAnnotation {
  if (annotation.status !== 'submitted') return annotation;
  return {
    ...annotation,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}
