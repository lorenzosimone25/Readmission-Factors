-- Add enrichment revision for soft offline cache refresh (does not affect note_version_hash).

alter table public.cases
  add column if not exists note_enrichment_version text not null default '';
