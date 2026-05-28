import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import { bumpAndSaveWorkingAnnotation } from '@/features/readmission/offline/localStores';
import type { ClinicianReadmissionAnnotation } from '@/features/readmission/types/readmissionAnnotation';

const CHECKPOINT_MS = 2000;

let pending: ClinicianReadmissionAnnotation | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function writeCheckpoint(annotation: ClinicianReadmissionAnnotation): Promise<void> {
  if (!hasReadmissionBackend()) return;
  await bumpAndSaveWorkingAnnotation(annotation);
}

export function scheduleAnnotationCheckpoint(annotation: ClinicianReadmissionAnnotation): void {
  if (!hasReadmissionBackend()) return;
  pending = annotation;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const snap = pending;
    pending = null;
    timer = null;
    if (snap) void writeCheckpoint(snap);
  }, CHECKPOINT_MS);
}

export function flushAnnotationCheckpoint(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const snap = pending;
  pending = null;
  if (snap) void writeCheckpoint(snap);
}

export function setupAnnotationCheckpointListeners(): () => void {
  const onHide = () => flushAnnotationCheckpoint();
  const onUnload = () => flushAnnotationCheckpoint();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
  window.addEventListener('beforeunload', onUnload);
  return () => {
    window.removeEventListener('beforeunload', onUnload);
  };
}
