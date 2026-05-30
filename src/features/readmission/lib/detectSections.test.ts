import { describe, expect, it } from 'vitest';

import { detectSections } from '@/features/readmission/lib/detectSections';

const MIMIC_STYLE_NOTE = `Name:  [**Known lastname 5378**]

Admission Date:  [**2117-3-29**]

Chief Complaint:
Chest pain.

History of Present Illness:
68F with HF.

Family History: Non-contributory.

HOSPITAL COURSE:
Patient diuresed.

DISCHARGE DIAGNOSES:
Heart failure.

Followup Instructions:
See cardiology.
`;

describe('detectSections (rules-first)', () => {
  it('detects inline Family History heading', () => {
    const sections = detectSections(MIMIC_STYLE_NOTE);
    const titles = sections.map((s) => s.sectionTitle);
    expect(titles).toContain('Family History');
    expect(titles).toContain('Preamble');
  });

  it('maps HOSPITAL COURSE alias to Brief Hospital Course', () => {
    const sections = detectSections(MIMIC_STYLE_NOTE);
    const titles = sections.map((s) => s.sectionTitle);
    expect(titles).toContain('Brief Hospital Course');
    expect(titles).toContain('Discharge Diagnosis');
  });

  it('does not treat metadata Name as a section', () => {
    const sections = detectSections(MIMIC_STYLE_NOTE);
    const titles = sections.map((s) => s.sectionTitle);
    expect(titles.some((t) => t.toLowerCase() === 'name')).toBe(false);
  });

  it('covers full note offsets', () => {
    const sections = detectSections(MIMIC_STYLE_NOTE);
    expect(sections[0]!.startChar).toBe(0);
    expect(sections[sections.length - 1]!.endChar).toBe(MIMIC_STYLE_NOTE.length);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('handles legacy Chief Complaint on own line', () => {
    const rawNote = 'Line one.\n\nChief Complaint:\nChest pain.';
    const sections = detectSections(rawNote);
    expect(sections.some((s) => s.sectionTitle === 'Chief Complaint')).toBe(true);
  });
});
