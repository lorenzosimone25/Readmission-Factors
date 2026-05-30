import { buildAliasToTitleMap } from '@/features/readmission/lib/sectionLexicon';
import type { StoredNoteSection } from '@/features/readmission/types/readmissionAnnotation';

export type NavSectionItem = {
  sectionId: string;
  title: string;
  startChar: number;
};

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toUpperCase();
}

function isPreambleSection(section: StoredNoteSection): boolean {
  return normalizeTitle(section.title) === 'PREAMBLE';
}

function canonicalTitle(rawTitle: string, aliasToTitle: Map<string, string>): string | null {
  return aliasToTitle.get(normalizeTitle(rawTitle)) ?? null;
}

/** Nav-only filter: canonical / preamble sections, deduped by title. Does not affect note rendering. */
export function navSectionsForDisplay(sections: StoredNoteSection[]): NavSectionItem[] {
  const aliasToTitle = buildAliasToTitleMap();
  const seenTitles = new Set<string>();
  const navItems: NavSectionItem[] = [];

  for (const section of sections) {
    if (isPreambleSection(section)) {
      const key = 'Preamble';
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      navItems.push({
        sectionId: section.id,
        title: section.title,
        startChar: section.startChar,
      });
      continue;
    }

    const canonical = canonicalTitle(section.title, aliasToTitle);
    if (!canonical) continue;
    if (seenTitles.has(canonical)) continue;

    seenTitles.add(canonical);
    navItems.push({
      sectionId: section.id,
      title: canonical,
      startChar: section.startChar,
    });
  }

  return navItems;
}

/** Map a visible content section to the active nav item (handles hidden subsections). */
export function resolveActiveNavSectionId(
  visibleSectionId: string | null,
  navItems: NavSectionItem[],
  allSections: StoredNoteSection[],
): string | null {
  if (!visibleSectionId || navItems.length === 0) return navItems[0]?.sectionId ?? null;

  const navIds = new Set(navItems.map((item) => item.sectionId));
  if (navIds.has(visibleSectionId)) return visibleSectionId;

  const visible = allSections.find((section) => section.id === visibleSectionId);
  if (!visible) return navItems[0]?.sectionId ?? null;

  let fallback: NavSectionItem | null = null;
  for (const item of navItems) {
    if (item.startChar <= visible.startChar) fallback = item;
    else break;
  }

  return fallback?.sectionId ?? navItems[0]?.sectionId ?? null;
}
