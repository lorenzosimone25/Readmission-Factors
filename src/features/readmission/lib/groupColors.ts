import type { EvidenceGroupColor } from '@/features/readmission/types/readmissionAnnotation';

const GROUP_COLOR_BG: Record<EvidenceGroupColor, string> = {
  amber: 'hsla(38, 90%, 68%, 0.55)',
  blue: 'hsla(210, 75%, 68%, 0.52)',
  green: 'hsla(145, 50%, 62%, 0.52)',
  violet: 'hsla(270, 55%, 72%, 0.52)',
  slate: 'hsla(215, 12%, 72%, 0.58)',
};

const GROUP_COLOR_ACCENT: Record<EvidenceGroupColor, string> = {
  amber: 'hsl(32, 75%, 42%)',
  blue: 'hsl(210, 65%, 42%)',
  green: 'hsl(145, 45%, 35%)',
  violet: 'hsl(270, 50%, 45%)',
  slate: 'hsl(215, 12%, 45%)',
};

/** Subtle wash for active factor cards (not note highlights or chips). */
const GROUP_COLOR_ACTIVE_CARD: Record<EvidenceGroupColor, string> = {
  amber: 'hsla(38, 55%, 72%, 0.10)',
  blue: 'hsla(210, 45%, 72%, 0.10)',
  green: 'hsla(145, 35%, 68%, 0.10)',
  violet: 'hsla(270, 40%, 74%, 0.10)',
  slate: 'hsla(215, 12%, 72%, 0.10)',
};

const GROUP_COLOR_ACTIVE_PILL: Record<EvidenceGroupColor, string> = {
  amber: 'hsla(38, 55%, 72%, 0.14)',
  blue: 'hsla(210, 45%, 72%, 0.14)',
  green: 'hsla(145, 35%, 68%, 0.14)',
  violet: 'hsla(270, 40%, 74%, 0.14)',
  slate: 'hsla(215, 42%, 72%, 0.14)',
};

export function groupHighlightBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_BG[color] ?? GROUP_COLOR_BG.slate;
}

/** Light tint for the selected factor row in the workbench panel. */
export function activeFactorCardBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACTIVE_CARD[color] ?? GROUP_COLOR_ACTIVE_CARD.slate;
}

export function activeFactorCardBorder(color: EvidenceGroupColor): string {
  const accent = GROUP_COLOR_ACCENT[color] ?? GROUP_COLOR_ACCENT.slate;
  return `color-mix(in srgb, ${accent} 28%, var(--color-border) 72%)`;
}

export function activeFactorPillBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACTIVE_PILL[color] ?? GROUP_COLOR_ACTIVE_PILL.slate;
}

export function groupAccentColor(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACCENT[color] ?? GROUP_COLOR_ACCENT.slate;
}

/** Alias used by UI components */
export const accentForGroupColor = groupAccentColor;
