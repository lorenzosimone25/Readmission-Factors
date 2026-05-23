import { groupAccentColor, groupHighlightBackground } from '@/features/readmission/lib/groupColors';
import type { EvidenceGroup, EvidenceGroupColor } from '@/features/readmission/types/readmissionAnnotation';

export function highlightForGroup(group: EvidenceGroup | undefined): string {
  if (!group) return 'hsla(38, 90%, 68%, 0.35)';
  return groupHighlightBackground(group.color);
}

export function accentForGroupColor(color: EvidenceGroupColor): string {
  return groupAccentColor(color);
}

/** @deprecated Use group-based colors; kept for legacy FactorCard */
export function factorAccentColor(factorId: string): string {
  let hash = 0;
  for (let i = 0; i < factorId.length; i++) {
    hash = factorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 42%)`;
}
