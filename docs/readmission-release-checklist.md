# Readmission annotator — manual release checklist

Run on `/research` after `npm run build` and a hard refresh.

1. **Preset Factor 1** — amber factor active on load.
2. **Add Factor 2** — click **Add another factor** (right panel top only); no white screen; new card scrolls into view; blue assigned.
3. **Highlight** — select text in note; only **floating** “Highlight as [factor]” appears; note header height does not jump.
4. **Two colors** — highlight different sentences under Factor 1 and Factor 2.
5. **Complete** — expand factor card → **Save & complete factor**; export JSON includes `groupId`, `factorId`, offsets.
6. **Delete factor** — confirm dialog when spans exist; last deleted factor restores Factor 1 preset.
7. **Draft restore** — edit highlights, wait ~1s, reload page; local draft restores when `noteVersionHash` matches.
8. **Validation** — submit with incomplete factors shows inline errors in right panel header (not only toast).
9. **Error boundary** — if a runtime error occurs, “Something went wrong” + Reload (not blank white screen).
