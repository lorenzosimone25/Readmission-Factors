-- One-time migration for existing Supabase projects (run in SQL Editor after initial schema).
-- Safe to re-run: uses IF NOT EXISTS on columns.

alter table public.cases
  add column if not exists index_discharge_summary_formatted text not null default '';

alter table public.cases
  add column if not exists readmit_discharge_summary_formatted text not null default '';

alter table public.cases
  add column if not exists index_note_sections jsonb not null default '[]'::jsonb;

alter table public.cases
  add column if not exists readmit_note_sections jsonb not null default '[]'::jsonb;

alter table public.cases
  add column if not exists note_formatting_meta jsonb not null default '{}'::jsonb;

alter table public.cases
  add column if not exists note_canonical_version text not null default 'raw_v0';

-- Add check constraint only if missing (Postgres has no IF NOT EXISTS for constraints).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cases_note_canonical_version_check'
  ) then
    alter table public.cases
      add constraint cases_note_canonical_version_check
      check (note_canonical_version in ('raw_v0', 'formatted_v1'));
  end if;
end $$;
