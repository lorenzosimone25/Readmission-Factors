import { describe, expect, it } from 'vitest';

import {
  navSectionsForDisplay,
  resolveActiveNavSectionId,
} from '@/features/readmission/lib/sectionNavFilter';
import type { StoredNoteSection } from '@/features/readmission/types/readmissionAnnotation';

function section(
  id: string,
  title: string,
  startChar: number,
  endChar: number,
): StoredNoteSection {
  return { id, title, startChar, endChar };
}

describe('navSectionsForDisplay', () => {
  it('includes preamble and canonical sections only, deduped by title', () => {
    const sections: StoredNoteSection[] = [
      section('sec-001', 'Preamble', 0, 100),
      section('sec-002', 'Chief Complaint', 100, 200),
      section('sec-003', 'Outpatient Cardiologist', 200, 300),
      section('sec-004', 'Allergies', 300, 350),
      section('sec-005', 'Allergies', 350, 400),
      section('sec-006', 'Hospital Course', 400, 500),
    ];

    const nav = navSectionsForDisplay(sections);
    expect(nav.map((item) => item.title)).toEqual([
      'Preamble',
      'Chief Complaint',
      'Allergies',
      'Brief Hospital Course',
    ]);
    expect(nav.find((item) => item.title === 'Allergies')?.sectionId).toBe('sec-004');
  });

  it('maps hospital course alias to canonical brief hospital course title', () => {
    const nav = navSectionsForDisplay([section('sec-1', 'Hospital Course', 0, 50)]);
    expect(nav).toHaveLength(1);
    expect(nav[0]!.title).toBe('Brief Hospital Course');
  });
});

describe('resolveActiveNavSectionId', () => {
  const allSections: StoredNoteSection[] = [
    section('sec-001', 'Preamble', 0, 100),
    section('sec-002', 'Chief Complaint', 100, 200),
    section('sec-003', 'Outpatient Cardiologist', 200, 300),
    section('sec-004', 'Allergies', 300, 400),
  ];
  const navItems = navSectionsForDisplay(allSections);

  it('returns visible id when section is in nav', () => {
    expect(resolveActiveNavSectionId('sec-002', navItems, allSections)).toBe('sec-002');
  });

  it('returns previous nav section when viewing a hidden subsection', () => {
    expect(resolveActiveNavSectionId('sec-003', navItems, allSections)).toBe('sec-002');
  });
});
