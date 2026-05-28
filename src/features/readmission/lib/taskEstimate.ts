import type {
  AnnotationStatus,
  ClinicianReadmissionAnnotation,
  ReadmissionCaseMetadata,
} from '@/features/readmission/types/readmissionAnnotation';
import { isDefaultFactorLabel } from '@/features/readmission/lib/factorLabelUtils';
import { validateForSubmit, type CaseNotes } from '@/features/readmission/lib/annotationValidation';
import { loadDraftRawFromStorage } from '@/features/readmission/lib/annotationStorage';

export type CaseQueueItem = ReadmissionCaseMetadata & {
  annotationStatus: AnnotationStatus;
  estimatedTasks: number;
  pendingSync?: boolean;
};

export type QueueFilter = 'all' | 'remaining' | 'not_started' | 'draft' | 'submitted';

const REVIEWER_ID = 'clinician-demo-01';

function countIncompleteFactors(annotation: ClinicianReadmissionAnnotation): number {
  let count = 0;
  for (const group of annotation.evidenceGroups) {
    const spans = annotation.evidenceSpans.filter((sp) => sp.groupId === group.id);
    if (spans.length === 0) continue;
    if (!group.finalizedFactorId) count += 1;
    else {
      const factor = annotation.factors.find((f) => f.id === group.finalizedFactorId);
      if (factor && isDefaultFactorLabel(factor.label)) count += 1;
    }
  }
  return count;
}

function hasPrimaryFactor(annotation: ClinicianReadmissionAnnotation): boolean {
  return annotation.factors.some(
    (f) =>
      f.role === 'primary' &&
      annotation.evidenceGroups.some((g) => g.finalizedFactorId === f.id),
  );
}

/** Estimate remaining clinician tasks for a case (supports large counts). */
export function estimateRemainingTasks(
  annotation: ClinicianReadmissionAnnotation | null,
  notes?: CaseNotes,
): number {
  if (!annotation) return 3;

  if (annotation.status === 'submitted') return 0;

  if (annotation.status === 'not_started') {
    return 3;
  }

  if (notes) {
    const validation = validateForSubmit(annotation, notes);
    if (validation.ok) return 0;
  }

  let tasks = 0;
  if (!hasPrimaryFactor(annotation)) tasks += 1;
  tasks += countIncompleteFactors(annotation);

  const hasAnyHighlight = annotation.evidenceSpans.length > 0;
  if (!hasAnyHighlight && annotation.evidenceGroups.length > 0) {
    tasks = Math.max(tasks, 1);
  }

  const defaultLabels = annotation.evidenceGroups.filter((g) => isDefaultFactorLabel(g.label));
  if (defaultLabels.length > 0) tasks += defaultLabels.length;

  return tasks;
}

export function annotationStatusFromDraft(
  draft: ClinicianReadmissionAnnotation | null,
): AnnotationStatus {
  if (!draft) return 'not_started';
  return draft.status;
}

export function buildQueueItem(
  metadata: ReadmissionCaseMetadata,
  _noteVersionHash?: string,
): CaseQueueItem {
  const draft = loadDraftRawFromStorage(metadata.rowId, REVIEWER_ID);
  const status = annotationStatusFromDraft(draft);
  return {
    ...metadata,
    annotationStatus: status,
    estimatedTasks: estimateRemainingTasks(draft),
  };
}

export function filterQueueItems(items: CaseQueueItem[], filter: QueueFilter, search: string): CaseQueueItem[] {
  let filtered = items;

  switch (filter) {
    case 'remaining':
      filtered = items.filter((i) => i.annotationStatus !== 'submitted');
      break;
    case 'not_started':
      filtered = items.filter((i) => i.annotationStatus === 'not_started');
      break;
    case 'draft':
      filtered = items.filter((i) => i.annotationStatus === 'draft');
      break;
    case 'submitted':
      filtered = items.filter((i) => i.annotationStatus === 'submitted');
      break;
    default:
      break;
  }

  const q = search.trim().toLowerCase();
  if (!q) return filtered;

  return filtered.filter(
    (i) =>
      i.rowId.toLowerCase().includes(q) ||
      i.patientIdentifier.toLowerCase().includes(q) ||
      i.subjectId.toLowerCase().includes(q) ||
      i.indexPrimaryIcdCode.toLowerCase().includes(q),
  );
}

export function sortQueueItems(
  items: CaseQueueItem[],
  sort: 'days_asc' | 'days_desc' | 'tasks_desc',
): CaseQueueItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === 'days_asc') return a.daysToReadmission - b.daysToReadmission;
    if (sort === 'days_desc') return b.daysToReadmission - a.daysToReadmission;
    return b.estimatedTasks - a.estimatedTasks;
  });
  return copy;
}

export const DEFAULT_REVIEWER_ID = REVIEWER_ID;
