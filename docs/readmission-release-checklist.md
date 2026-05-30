# Readmission annotator — manual release checklist

Run on `/research` after `npm run build` and a hard refresh.

## Core workflow

1. **Preset Factor 1** — amber factor active on load.
2. **Add Factor 2** — click **Add another factor** (right panel top only); no white screen; new card scrolls into view; blue assigned.
3. **Highlight** — select text in note; only **floating** “Highlight as [factor]” appears; note header height does not jump.
4. **Two colors** — highlight different sentences under Factor 1 and Factor 2.
5. **Complete factor collapse** — **Save & complete factor** collapses the card; factor stays active for new highlights.
6. **Highlight popover** — click a highlight → **Remove highlight** only (no whole-factor delete); factor delete stays on factor card trash.
7. **Navigation guard** — dirty case → sidebar **Notes left**, top **Dashboard**, **Prev/Next**, or browser back → same unsaved dialog; Save & leave / Discard / Cancel.
8. **Revise + resubmit** — submit case → edit → **Save draft** works → **Resubmit** → queue shows Done; banner on submitted/reopened cases.

## Persistence & export

9. **Draft save** — explicit **Save draft** (no autosave hammering); Supabase + local shadow after online save.
10. **Export audit** — download JSON has finalized factors only; no `modifiability` / `foreseeableFromIndexDischarge` / `rationale` unless UI collects them.
11. **Submit validation** — unfinalized evidence groups block submit with inline errors in right panel header.

## UX polish

12. **Role buttons** — Primary and Contributing both use blue when selected.
13. **Toast dedupe** — rapid factor saves do not stack duplicate success toasts.
14. **Queue CTA** — submitted cases show **View / revise** on Notes left cards.

## Offline-first (IndexedDB + sync)

17. **Bootstrap** — first online login shows “Downloading cases (n/N)”; queue populates; header shows Online.
18. **Offline read** — after bootstrap, airplane mode → Notes Left loads → open case → both notes visible.
19. **Offline highlight** — add highlights + Save draft offline → force-close tab → reopen → spans still present.
20. **Offline submit** — Submit offline → toast “Submitted on this device…” → pending sync dot → online → **Sync now** → DB submitted.
21. **Reconnect sync** — edit offline → online → pending count clears; Supabase payload matches export (no lost spans).
22. **Cohort hash** — if `note_version_hash` changes server-side, stale local annotation is not silently merged (re-bootstrap required).

## Regression

23. **Delete factor** — confirm dialog when spans exist; trash on factor card only.
24. **Error boundary** — runtime error shows “Something went wrong” + Reload (not blank white screen).

## Pre-publish section labeling (operator)

Run once before clinician go-live:

1. Apply `supabase/migrations/001_note_polish_columns.sql` and `002_note_enrichment_version.sql` if not already applied.
2. Run `notebooks/setup_cohort.ipynb` (raw upsert + assignments).
3. Configure `notebooks/.env` (Supabase service role only; no Ollama required).
4. Optional: run `notebooks/inspect_note_headings.ipynb` to review heading frequencies and lexicon coverage.
5. Run **pilot** in `notebooks/polish_notes.ipynb` on case `137`; confirm multiple sections (not one Preamble on long notes).
6. Run **batch** with `DRY_RUN=false`; expect all assigned cases labeled with `sections-rules-v1` (`section_source: rules`; warnings OK).
7. Optional: run **Export cohort sections parquet** cell in `polish_notes.ipynb` → `src/data/readmit_30d_sections.parquet`.
8. Deploy frontend; smoke **Magic Beta** in single-note layout (TOC jump, highlights still work) and split view (Beta disabled).
9. Smoke: highlight → save draft → export JSON includes `noteCanonical: raw_v0`, `sectionTitle`, `sectionId`, and `factorSectionSummary`. No IndexedDB reset required (hash unchanged).
