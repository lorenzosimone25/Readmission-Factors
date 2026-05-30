import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient {
  if (!hasSupabase()) {
    throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL!.trim(),
      import.meta.env.VITE_SUPABASE_ANON_KEY!.trim(),
    );
  }
  return client;
}

export type ProfileRow = {
  id: string;
  display_name: string;
  role: string;
};

export type CaseRow = {
  row_id: string;
  patient_identifier: string;
  subject_id: string;
  index_hadm_id: string;
  readmit_hadm_id: string;
  index_primary_icd_code: string;
  days_to_readmit: number;
  readmit_has_icu: boolean | null;
  index_discharge_summary: string;
  readmit_discharge_summary: string;
  index_discharge_summary_formatted?: string;
  readmit_discharge_summary_formatted?: string;
  index_note_sections?: StoredNoteSectionRow[] | null;
  readmit_note_sections?: StoredNoteSectionRow[] | null;
  note_formatting_meta?: Record<string, unknown> | null;
  note_canonical_version?: string;
  note_enrichment_version?: string;
  note_version_hash: string;
};

export type StoredNoteSectionRow = {
  id: string;
  title: string;
  startChar: number;
  endChar: number;
};

export type AssignmentRow = {
  id: string;
  user_id: string;
  row_id: string;
  status: string;
  assigned_at: string;
  submitted_at: string | null;
};

export type AnnotationRow = {
  user_id: string;
  row_id: string;
  payload: Record<string, unknown>;
  note_version_hash: string;
  status: string;
  updated_at: string;
};

export type AssignmentWithCase = AssignmentRow & {
  cases: CaseRow;
  annotations: AnnotationRow | AnnotationRow[] | null;
};
