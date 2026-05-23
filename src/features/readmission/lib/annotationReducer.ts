import { newId } from '@/features/readmission/lib/newId';
import {
  nextEvidenceGroupColor,
  nextFactorLabel,
} from '@/features/readmission/lib/evidenceGroupPalette';
import type {
  ClinicianReadmissionAnnotation,
  EvidenceGroup,
  EvidenceGroupColor,
  EvidenceSpan,
  FactorFinalizePatch,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

export function touchAnnotation(
  prev: ClinicianReadmissionAnnotation,
): ClinicianReadmissionAnnotation {
  return { ...prev, updatedAt: new Date().toISOString() };
}

export function createPresetGroup(): EvidenceGroup {
  const now = new Date().toISOString();
  return {
    id: newId('group'),
    label: 'Factor 1',
    color: 'amber',
    finalizedFactorId: null,
    note: '',
    createdAt: now,
  };
}

export type AddGroupResult = {
  annotation: ClinicianReadmissionAnnotation;
  group: EvidenceGroup;
};

export function addEvidenceGroupToAnnotation(
  prev: ClinicianReadmissionAnnotation,
  label?: string,
  color?: EvidenceGroupColor,
): AddGroupResult {
  const now = new Date().toISOString();
  const usedColors = prev.evidenceGroups.map((g) => g.color);
  const group: EvidenceGroup = {
    id: newId('group'),
    label:
      typeof label === 'string' && label.trim()
        ? label.trim()
        : nextFactorLabel(prev.evidenceGroups),
    color: color ?? nextEvidenceGroupColor(usedColors),
    finalizedFactorId: null,
    note: '',
    createdAt: now,
  };
  return {
    group,
    annotation: touchAnnotation({
      ...prev,
      status: prev.status === 'not_started' ? 'draft' : prev.status,
      evidenceGroups: [...prev.evidenceGroups, group],
    }),
  };
}

export function removeEvidenceGroupFromAnnotation(
  prev: ClinicianReadmissionAnnotation,
  groupId: string,
): ClinicianReadmissionAnnotation {
  const removed = prev.evidenceGroups.find((g) => g.id === groupId);
  const removedFactorId = removed?.finalizedFactorId;
  let next: ClinicianReadmissionAnnotation = {
    ...prev,
    evidenceGroups: prev.evidenceGroups.filter((g) => g.id !== groupId),
    evidenceSpans: prev.evidenceSpans.filter((sp) => sp.groupId !== groupId),
    factors: prev.factors.filter((f) => f.id !== removedFactorId),
  };

  if (next.evidenceGroups.length === 0) {
    const preset = createPresetGroup();
    next = {
      ...next,
      evidenceGroups: [preset],
    };
  }

  return touchAnnotation(next);
}

export function renameEvidenceGroup(
  prev: ClinicianReadmissionAnnotation,
  groupId: string,
  label: string,
): ClinicianReadmissionAnnotation {
  return touchAnnotation({
    ...prev,
    evidenceGroups: prev.evidenceGroups.map((g) =>
      g.id === groupId ? { ...g, label } : g,
    ),
  });
}

export function updateEvidenceGroupNote(
  prev: ClinicianReadmissionAnnotation,
  groupId: string,
  note: string,
): ClinicianReadmissionAnnotation {
  return touchAnnotation({
    ...prev,
    evidenceGroups: prev.evidenceGroups.map((g) =>
      g.id === groupId ? { ...g, note } : g,
    ),
  });
}

export function addSpanToAnnotation(
  prev: ClinicianReadmissionAnnotation,
  span: EvidenceSpan,
): ClinicianReadmissionAnnotation {
  return touchAnnotation({
    ...prev,
    status: prev.status === 'not_started' ? 'draft' : prev.status,
    evidenceSpans: [...prev.evidenceSpans, span],
  });
}

export function removeSpanFromAnnotation(
  prev: ClinicianReadmissionAnnotation,
  spanId: string,
): ClinicianReadmissionAnnotation {
  const removed = prev.evidenceSpans.find((sp) => sp.id === spanId);
  const newSpans = prev.evidenceSpans.filter((sp) => sp.id !== spanId);
  const groupId = removed?.groupId;
  const remainingInGroup = groupId
    ? newSpans.filter((sp) => sp.groupId === groupId).length
    : 0;

  let factors = prev.factors.map((f) => ({
    ...f,
    evidenceSpanIds: f.evidenceSpanIds.filter((id) => id !== spanId),
  }));

  let evidenceGroups = prev.evidenceGroups;
  if (groupId && remainingInGroup === 0) {
    const group = prev.evidenceGroups.find((g) => g.id === groupId);
    if (group?.finalizedFactorId) {
      factors = factors.filter((f) => f.id !== group.finalizedFactorId);
    }
    evidenceGroups = evidenceGroups.map((g) =>
      g.id === groupId ? { ...g, finalizedFactorId: null } : g,
    );
  }

  return touchAnnotation({
    ...prev,
    evidenceSpans: newSpans,
    factors,
    evidenceGroups,
  });
}

export function reassignSpanInAnnotation(
  prev: ClinicianReadmissionAnnotation,
  spanId: string,
  newGroupId: string,
): ClinicianReadmissionAnnotation {
  return touchAnnotation({
    ...prev,
    evidenceSpans: prev.evidenceSpans.map((sp) => {
      if (sp.id !== spanId) return sp;
      const targetGroup = prev.evidenceGroups.find((g) => g.id === newGroupId);
      return {
        ...sp,
        groupId: newGroupId,
        factorId: targetGroup?.finalizedFactorId ?? null,
      };
    }),
  });
}

export function finalizeGroupInAnnotation(
  prev: ClinicianReadmissionAnnotation,
  groupId: string,
  patch: FactorFinalizePatch,
): ClinicianReadmissionAnnotation {
  const groupSpans = prev.evidenceSpans.filter((sp) => sp.groupId === groupId);
  const factorId = newId('factor');
  const factor: ReadmissionFactor = {
    id: factorId,
    label: patch.label,
    role: patch.role,
    modifiability: patch.modifiability,
    foreseeableFromIndexDischarge: patch.foreseeableFromIndexDischarge,
    confidence: patch.confidence,
    rationale: patch.rationale,
    note: patch.note,
    evidenceSpanIds: groupSpans.map((sp) => sp.id),
  };

  return touchAnnotation({
    ...prev,
    status: prev.status === 'not_started' ? 'draft' : prev.status,
    factors: [
      ...prev.factors.filter((f) => {
        const g = prev.evidenceGroups.find((gr) => gr.id === groupId);
        return f.id !== g?.finalizedFactorId;
      }),
      factor,
    ],
    evidenceSpans: prev.evidenceSpans.map((sp) =>
      sp.groupId === groupId ? { ...sp, factorId } : sp,
    ),
    evidenceGroups: prev.evidenceGroups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            finalizedFactorId: factorId,
            label: patch.label || g.label,
            note: patch.note,
          }
        : g,
    ),
  });
}

export function updateFinalizedFactorInAnnotation(
  prev: ClinicianReadmissionAnnotation,
  groupId: string,
  patch: FactorFinalizePatch,
): ClinicianReadmissionAnnotation {
  const group = prev.evidenceGroups.find((g) => g.id === groupId);
  if (!group?.finalizedFactorId) return prev;

  let next = updateFactorInAnnotation(prev, group.finalizedFactorId, {
    label: patch.label,
    role: patch.role,
    modifiability: patch.modifiability,
    foreseeableFromIndexDischarge: patch.foreseeableFromIndexDischarge,
    confidence: patch.confidence,
    rationale: patch.rationale,
    note: patch.note,
  });
  next = renameEvidenceGroup(next, groupId, patch.label || group.label);
  next = updateEvidenceGroupNote(next, groupId, patch.note);
  return next;
}

export function updateFactorInAnnotation(
  prev: ClinicianReadmissionAnnotation,
  factorId: string,
  patch: Partial<ReadmissionFactor>,
): ClinicianReadmissionAnnotation {
  return touchAnnotation({
    ...prev,
    factors: prev.factors.map((f) => (f.id === factorId ? { ...f, ...patch } : f)),
  });
}

/** Resolve active group; never returns id missing from annotation. */
export function resolveActiveGroupId(
  annotation: ClinicianReadmissionAnnotation,
  activeGroupId: string | null,
): string | null {
  if (!activeGroupId) return annotation.evidenceGroups[0]?.id ?? null;
  if (annotation.evidenceGroups.some((g) => g.id === activeGroupId)) return activeGroupId;
  return annotation.evidenceGroups[0]?.id ?? null;
}
