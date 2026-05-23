import type { EvidenceGroupColor } from '@/features/readmission/types/readmissionAnnotation';

export const EVIDENCE_GROUP_COLORS: EvidenceGroupColor[] = [
  'amber',
  'blue',
  'green',
  'violet',
  'slate',
];

export function nextEvidenceGroupColor(used: EvidenceGroupColor[]): EvidenceGroupColor {
  const available = EVIDENCE_GROUP_COLORS.filter((c) => !used.includes(c));
  if (available.length > 0) return available[0]!;
  return EVIDENCE_GROUP_COLORS[used.length % EVIDENCE_GROUP_COLORS.length]!;
}

/** Next unique "Factor N" label based on existing group labels. */
export function nextFactorLabel(groups: { label: string }[]): string {
  let max = 0;
  for (const g of groups) {
    const match = /^Factor\s+(\d+)$/i.exec(g.label.trim());
    if (match) max = Math.max(max, Number.parseInt(match[1]!, 10));
  }
  return `Factor ${max + 1}`;
}

/** @deprecated Use nextFactorLabel */
export function defaultFactorLabel(existingCount: number): string {
  return `Factor ${existingCount + 1}`;
}
