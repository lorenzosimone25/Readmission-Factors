import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Circle, CircleGauge } from 'lucide-react';

import type { AnnotationStatus } from '@/features/readmission/types/readmissionAnnotation';

export type QueueStatusDisplay = {
  label: string;
  accentColor: string;
  badgeBackground: string;
  badgeColor: string;
  badgeBorder: string;
  Icon: LucideIcon;
};

export function queueStatusDisplay(status: AnnotationStatus): QueueStatusDisplay {
  if (status === 'submitted') {
    return {
      label: 'Completed',
      accentColor: 'hsl(145, 45%, 38%)',
      badgeBackground: 'hsla(145, 50%, 62%, 0.2)',
      badgeColor: 'hsl(145, 45%, 28%)',
      badgeBorder: 'hsla(145, 45%, 40%, 0.45)',
      Icon: CheckCircle2,
    };
  }
  if (status === 'draft') {
    return {
      label: 'In progress',
      accentColor: 'hsl(38, 85%, 42%)',
      badgeBackground: 'hsla(38, 90%, 55%, 0.18)',
      badgeColor: 'hsl(38, 80%, 28%)',
      badgeBorder: 'hsla(38, 90%, 45%, 0.45)',
      Icon: CircleGauge,
    };
  }
  return {
    label: 'Not started',
    accentColor: 'var(--color-text-tertiary)',
    badgeBackground: 'var(--color-panel-alt)',
    badgeColor: 'var(--color-text-secondary)',
    badgeBorder: 'var(--color-border-strong)',
    Icon: Circle,
  };
}
