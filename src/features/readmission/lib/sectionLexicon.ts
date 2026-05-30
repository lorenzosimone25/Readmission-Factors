import lexiconData from '@/features/readmission/lib/section_lexicon.json';

export type SectionLexiconEntry = {
  title: string;
  aliases: string[];
  priority: number;
};

export type SectionLexicon = {
  version: number;
  preambleBeforeFirst: boolean;
  minNoteCharsForMultiSectionWarning: number;
  denyHeadings: string[];
  footerMarkers: string[];
  canonical: SectionLexiconEntry[];
};

export const SECTION_LEXICON = lexiconData as SectionLexicon;

export const CLINICAL_SECTION_HEADINGS = SECTION_LEXICON.canonical.map(
  (entry) => entry.title,
) as readonly string[];

export type ClinicalSectionHeading = (typeof CLINICAL_SECTION_HEADINGS)[number];

function normalizeHeading(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

function alphaCount(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) count += 1;
  }
  return count;
}

export function buildAliasToTitleMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of SECTION_LEXICON.canonical) {
    map.set(normalizeHeading(entry.title), entry.title);
    for (const alias of entry.aliases) {
      map.set(normalizeHeading(alias), entry.title);
    }
  }
  return map;
}

export function buildSortedAliases(): string[] {
  const aliases = new Set<string>();
  for (const entry of SECTION_LEXICON.canonical) {
    aliases.add(normalizeHeading(entry.title));
    for (const alias of entry.aliases) {
      aliases.add(normalizeHeading(alias));
    }
  }
  return [...aliases].sort((a, b) => b.length - a.length);
}

export function isDeniedHeading(rawHeading: string): boolean {
  const norm = normalizeHeading(rawHeading);
  const deny = new Set(SECTION_LEXICON.denyHeadings.map(normalizeHeading));
  if (deny.has(norm)) return true;
  return alphaCount(norm) < 3;
}

export function footerStart(rawNote: string): number | null {
  let earliest: number | null = null;
  for (const marker of SECTION_LEXICON.footerMarkers) {
    const idx = rawNote.indexOf(marker);
    if (idx >= 0) {
      earliest = earliest === null ? idx : Math.min(earliest, idx);
    }
  }
  return earliest;
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  const dist = dp[m]![n]!;
  return 1 - dist / Math.max(m, n);
}

const FUZZY_THRESHOLD = 0.82;

export function fuzzyMapHeading(rawHeading: string, aliasToTitle: Map<string, string>): string | null {
  const norm = normalizeHeading(rawHeading);
  const direct = aliasToTitle.get(norm);
  if (direct) return direct;
  let bestTitle: string | null = null;
  let bestScore = 0;
  for (const [alias, title] of aliasToTitle) {
    const score = levenshteinRatio(norm, alias);
    if (score > bestScore) {
      bestScore = score;
      bestTitle = title;
    }
  }
  return bestScore >= FUZZY_THRESHOLD ? bestTitle : null;
}

export function buildLexiconHeadingPattern(): RegExp {
  const aliases = buildSortedAliases().map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?:^|\\n)(\\s*)(${aliases.join('|')})\\s*:\\s*`, 'gi');
}

export const GENERIC_HEADING_RE = /(?:^|\n)(\s*)([A-Z][A-Z0-9 \-/]{2,50})\s*:\s*/g;

/** @deprecated Use buildLexiconHeadingPattern() — kept for tests comparing legacy behavior. */
export const SECTION_HEADING_RE = buildLexiconHeadingPattern();
