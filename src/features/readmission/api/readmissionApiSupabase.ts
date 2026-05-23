import { getSupabase } from '@/lib/supabaseClient';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import type {
  ClinicianReadmissionAnnotation,
} from '@/features/readmission/types/readmissionAnnotation';
import type { ReadmissionApi } from '@/features/readmission/api/readmissionApiTypes';
import {
  assignmentToQueueItem,
  caseRowToReadmissionCase,
  payloadFromAnnotation,
} from '@/features/readmission/api/supabaseMappers';
import type { AssignmentWithCase, CaseRow } from '@/lib/supabaseClient';

function asCaseRow(value: unknown): CaseRow {
  const row = Array.isArray(value) ? value[0] : value;
  return row as CaseRow;
}

function asAssignmentRow(value: unknown): AssignmentWithCase {
  const raw = value as Record<string, unknown>;
  return {
    ...(raw as Omit<AssignmentWithCase, 'cases' | 'annotations'>),
    cases: asCaseRow(raw.cases),
    annotations: (raw.annotations as AssignmentWithCase['annotations']) ?? null,
  };
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Not authenticated');
  }
  return data.user.id;
}

export const readmissionApiSupabase: ReadmissionApi = {
  async listCaseSummaries() {
    const userId = await requireUserId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
        id,
        user_id,
        row_id,
        status,
        assigned_at,
        submitted_at,
        cases (*),
        annotations (payload, status, note_version_hash, updated_at)
      `,
      )
      .eq('user_id', userId)
      .order('assigned_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => assignmentToQueueItem(asAssignmentRow(row)));
  },

  async loadCase(rowId) {
    const userId = await requireUserId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('assignments')
      .select('row_id, cases (*)')
      .eq('user_id', userId)
      .eq('row_id', rowId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.cases) return null;

    const caseRow = asCaseRow(data.cases);
    return caseRowToReadmissionCase(caseRow, userId);
  },

  async loadAnnotation(caseId, _reviewerId, noteVersionHash) {
    const userId = await requireUserId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('annotations')
      .select('payload, note_version_hash')
      .eq('user_id', userId)
      .eq('row_id', caseId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.payload || Object.keys(data.payload as object).length === 0) return null;

    const ann = normalizeAnnotation(data.payload as ClinicianReadmissionAnnotation);
    const storedHash = data.note_version_hash || ann.noteVersionHash;
    if (storedHash !== noteVersionHash) return null;
    return ann;
  },

  async saveAnnotation(annotation) {
    const userId = await requireUserId();
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const status = annotation.status ?? 'draft';

    const { error: annError } = await supabase.from('annotations').upsert(
      {
        user_id: userId,
        row_id: annotation.caseId,
        payload: payloadFromAnnotation({ ...annotation, updatedAt: now, status }),
        note_version_hash: annotation.noteVersionHash,
        status,
        updated_at: now,
      },
      { onConflict: 'user_id,row_id' },
    );

    if (annError) throw new Error(annError.message);

    const { error: assignError } = await supabase
      .from('assignments')
      .update({ status })
      .eq('user_id', userId)
      .eq('row_id', annotation.caseId);

    if (assignError) throw new Error(assignError.message);
  },

  async submitAnnotation(annotation) {
    const userId = await requireUserId();
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const submitted = { ...annotation, status: 'submitted' as const, updatedAt: now };

    const { error: annError } = await supabase.from('annotations').upsert(
      {
        user_id: userId,
        row_id: annotation.caseId,
        payload: payloadFromAnnotation(submitted),
        note_version_hash: annotation.noteVersionHash,
        status: 'submitted',
        updated_at: now,
      },
      { onConflict: 'user_id,row_id' },
    );

    if (annError) throw new Error(annError.message);

    const { error: assignError } = await supabase
      .from('assignments')
      .update({ status: 'submitted', submitted_at: now })
      .eq('user_id', userId)
      .eq('row_id', annotation.caseId);

    if (assignError) throw new Error(assignError.message);

    return normalizeAnnotation(submitted);
  },
};
