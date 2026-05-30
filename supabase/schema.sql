-- Readmission Factors — Supabase schema
-- Run once in Supabase SQL Editor (Phase 0–1).

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cases (cohort rows + discharge summaries)
-- ---------------------------------------------------------------------------

create table if not exists public.cases (
  row_id text primary key,
  patient_identifier text not null default '',
  subject_id text not null default '',
  index_hadm_id text not null default '',
  readmit_hadm_id text not null default '',
  index_primary_icd_code text not null default '',
  days_to_readmit integer not null default 0,
  readmit_has_icu boolean,
  index_discharge_summary text not null default '',
  readmit_discharge_summary text not null default '',
  index_discharge_summary_formatted text not null default '',
  readmit_discharge_summary_formatted text not null default '',
  index_note_sections jsonb not null default '[]'::jsonb,
  readmit_note_sections jsonb not null default '[]'::jsonb,
  note_formatting_meta jsonb not null default '{}'::jsonb,
  note_canonical_version text not null default 'raw_v0'
    check (note_canonical_version in ('raw_v0', 'formatted_v1')),
  note_enrichment_version text not null default '',
  note_version_hash text not null default ''
);

-- ---------------------------------------------------------------------------
-- Assignments (clinician ↔ case)
-- ---------------------------------------------------------------------------

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null references public.cases (row_id) on delete cascade,
  status text not null default 'not_started',
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (user_id, row_id)
);

create index if not exists idx_assignments_user_id on public.assignments (user_id);
create index if not exists idx_assignments_row_id on public.assignments (row_id);

-- ---------------------------------------------------------------------------
-- Annotations (per-user draft/submitted JSON payload)
-- ---------------------------------------------------------------------------

create table if not exists public.annotations (
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null references public.cases (row_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  note_version_hash text not null default '',
  status text not null default 'not_started',
  updated_at timestamptz not null default now(),
  primary key (user_id, row_id)
);

create index if not exists idx_annotations_user_id on public.annotations (user_id);

-- Link annotations to assignments for PostgREST nested selects
alter table public.annotations
  add constraint annotations_assignment_fkey
  foreign key (user_id, row_id)
  references public.assignments (user_id, row_id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.assignments enable row level security;
alter table public.annotations enable row level security;

-- Profiles: users read their own row
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Cases: readable only when assigned to current user
create policy "cases_select_assigned"
  on public.cases for select
  using (
    exists (
      select 1 from public.assignments a
      where a.row_id = cases.row_id
        and a.user_id = auth.uid()
    )
  );

-- Assignments: readable only for current user
create policy "assignments_select_own"
  on public.assignments for select
  using (auth.uid() = user_id);

-- Annotations: read own rows for assigned cases
create policy "annotations_select_own"
  on public.annotations for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.assignments a
      where a.row_id = annotations.row_id
        and a.user_id = auth.uid()
    )
  );

-- Annotations: insert own rows for assigned cases
create policy "annotations_insert_own"
  on public.annotations for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.assignments a
      where a.row_id = annotations.row_id
        and a.user_id = auth.uid()
    )
  );

-- Annotations: update own rows for assigned cases
create policy "annotations_update_own"
  on public.annotations for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.assignments a
      where a.row_id = annotations.row_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.assignments a
      where a.row_id = annotations.row_id
        and a.user_id = auth.uid()
    )
  );

-- Assignments: allow clinicians to update status on their own rows (save/submit)
create policy "assignments_update_own"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete policies on cases or assignments for authenticated users.
-- Admin setup uses the service_role key in the setup notebook.
