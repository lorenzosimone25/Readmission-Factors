import {
  countWords,
  isNoteWithinWordLimit,
  MAX_FACTOR_NOTE_WORDS,
} from '@/features/readmission/lib/noteLimits';
import { isDefaultFactorLabel } from '@/features/readmission/lib/factorLabelUtils';
import type {
  ClinicianReadmissionAnnotation,
  ClinicalNoteType,
  FactorFinalizePatch,
  FactorRole,
} from '@/features/readmission/types/readmissionAnnotation';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type CaseNotes = {
  indexRawNote: string;
  readmissionRawNote: string;
  indexCanonicalNote: string;
  readmissionCanonicalNote: string;
  noteVersionHash: string;
};

export function validateEvidenceSpanText(
  rawNote: string,
  startChar: number,
  endChar: number,
  selectedText: string,
): boolean {
  return rawNote.slice(startChar, endChar) === selectedText;
}

function canonicalNoteForType(notes: CaseNotes, noteType: ClinicalNoteType): string {
  return noteType === 'index_hf' ? notes.indexCanonicalNote : notes.readmissionCanonicalNote;
}

function finalizedFactors(annotation: ClinicianReadmissionAnnotation) {
  return annotation.factors.filter((f) =>
    annotation.evidenceGroups.some((g) => g.finalizedFactorId === f.id),
  );
}

/** Validate a single factor form before save/complete. */
export function validateFactorPatch(patch: FactorFinalizePatch): string[] {
  const errors: string[] = [];
  const label = patch.label.trim();
  if (!label) {
    errors.push('Factor label is required.');
  } else if (isDefaultFactorLabel(label)) {
    errors.push('Give this factor a descriptive name (not "Factor N").');
  }
  if (!patch.role) {
    errors.push('Select a role: Primary or Contributing.');
  }
  if (patch.note.trim() && !isNoteWithinWordLimit(patch.note)) {
    errors.push(`Clinician note must be ${MAX_FACTOR_NOTE_WORDS} words or fewer.`);
  }
  if (patch.confidence < 1 || patch.confidence > 5) {
    errors.push('Select a confidence level from 1 to 5.');
  }
  return errors;
}

export function validateForSubmit(
  annotation: ClinicianReadmissionAnnotation,
  notes: CaseNotes,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (annotation.noteVersionHash !== notes.noteVersionHash) {
    errors.push('Annotation note version hash does not match the current case notes.');
  }

  const factors = finalizedFactors(annotation);

  if (factors.length === 0) {
    errors.push('At least one finalized readmission factor is required before submission.');
  }

  if (factors.length > 0 && !factors.some((f) => f.role === 'primary')) {
    errors.push('At least one primary readmission factor is required.');
  }

  for (const factor of factors) {
    const name = factor.label.trim() || factor.id;
    if (!factor.label.trim()) {
      errors.push(`Factor "${name}": label is required.`);
    } else if (isDefaultFactorLabel(factor.label)) {
      errors.push(`Factor "${name}": rename from default "Factor N" label.`);
    }
    if (factor.role !== 'primary' && factor.role !== 'contributing') {
      errors.push(`Factor "${name}": role must be Primary or Contributing.`);
    }
    if (factor.confidence < 1 || factor.confidence > 5) {
      errors.push(`Factor "${name}": confidence must be between 1 and 5.`);
    }
    if (factor.note.trim() && !isNoteWithinWordLimit(factor.note)) {
      errors.push(
        `Factor "${name}": clinician note exceeds ${MAX_FACTOR_NOTE_WORDS} words (${countWords(factor.note)}).`,
      );
    }

    const linkedSpans = annotation.evidenceSpans.filter((sp) => sp.factorId === factor.id);
    if (linkedSpans.length === 0) {
      errors.push(`Factor "${name}": at least one evidence span is required.`);
    }
  }

  for (const span of annotation.evidenceSpans) {
    const canonicalNote = canonicalNoteForType(notes, span.noteType);
    if (!validateEvidenceSpanText(canonicalNote, span.startChar, span.endChar, span.selectedText)) {
      errors.push(
        `Evidence span ${span.id}: selectedText does not match ${span.noteType} note slice(${span.startChar}, ${span.endChar}).`,
      );
    }
    const group = annotation.evidenceGroups.find((g) => g.id === span.groupId);
    if (!group) {
      errors.push(`Evidence span ${span.id}: linked evidence group not found.`);
    }
    if (span.factorId) {
      const factor = annotation.factors.find((f) => f.id === span.factorId);
      if (!factor) {
        errors.push(`Evidence span ${span.id}: linked factor not found.`);
      }
    }
  }

  for (const group of annotation.evidenceGroups) {
    if (group.finalizedFactorId) continue;
    const name = group.label.trim() || 'Unnamed factor';
    const groupSpans = annotation.evidenceSpans.filter((sp) => sp.groupId === group.id);
    if (groupSpans.length > 0) {
      errors.push(
        `Factor "${name}": incomplete — ${groupSpans.length} highlight(s) but not saved. Complete it or delete it.`,
      );
    } else {
      errors.push(
        `Factor "${name}": incomplete — no highlights and not saved. Complete it or delete it.`,
      );
    }
  }

  for (const factor of factors) {
    for (const spanId of factor.evidenceSpanIds) {
      if (!annotation.evidenceSpans.some((sp) => sp.id === spanId)) {
        warnings.push(`Factor "${factor.label}": references missing evidence span ${spanId}.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function isValidFactorRole(role: string): role is FactorRole {
  return role === 'primary' || role === 'contributing';
}
