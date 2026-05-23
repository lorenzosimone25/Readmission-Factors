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

/** Tint for the selected factor card (stronger than note highlight, weaker than active pill). */
const GROUP_COLOR_ACTIVE_CARD: Record<EvidenceGroupColor, string> = {
  amber: 'hsla(38, 80%, 60%, 0.22)',
  blue: 'hsla(210, 70%, 60%, 0.22)',
  green: 'hsla(145, 55%, 55%, 0.22)',
  violet: 'hsla(270, 60%, 65%, 0.22)',
  slate: 'hsla(215, 15%, 65%, 0.22)',
};

const GROUP_COLOR_ACTIVE_PILL: Record<EvidenceGroupColor, string> = {
  amber: 'hsla(38, 80%, 60%, 0.32)',
  blue: 'hsla(210, 70%, 60%, 0.32)',
  green: 'hsla(145, 55%, 55%, 0.32)',
  violet: 'hsla(270, 60%, 65%, 0.32)',
  slate: 'hsla(215, 22%, 65%, 0.32)',
};

export function groupHighlightBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_BG[color] ?? GROUP_COLOR_BG.slate;
}

/** Light tint for the selected factor row in the workbench panel. */
export function activeFactorCardBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACTIVE_CARD[color] ?? GROUP_COLOR_ACTIVE_CARD.slate;
}

export function activeFactorCardBorder(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACCENT[color] ?? GROUP_COLOR_ACCENT.slate;
}

/** Soft glow shadow for the active factor card. */
export function activeFactorCardShadow(color: EvidenceGroupColor): string {
  const accent = GROUP_COLOR_ACCENT[color] ?? GROUP_COLOR_ACCENT.slate;
  return `0 2px 10px color-mix(in srgb, ${accent} 30%, transparent)`;
}

export function activeFactorPillBackground(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACTIVE_PILL[color] ?? GROUP_COLOR_ACTIVE_PILL.slate;
}

export function groupAccentColor(color: EvidenceGroupColor): string {
  return GROUP_COLOR_ACCENT[color] ?? GROUP_COLOR_ACCENT.slate;
}

/** Alias used by UI components */
export const accentForGroupColor = groupAccentColor;
