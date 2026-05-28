# Offline persistence

## Architecture

| Layer | Module | Role |
|-------|--------|------|
| IndexedDB | [`localDb.ts`](../src/features/readmission/offline/localDb.ts) | Dexie stores: assignments, cases, working_annotations, sync_outbox, sync_meta |
| Bootstrap | [`BootstrapService.ts`](../src/features/readmission/offline/BootstrapService.ts) | First online login: download queue + cases + annotations |
| Catalog | [`CaseCatalogRepository.ts`](../src/features/readmission/offline/CaseCatalogRepository.ts) | Offline queue + case reads |
| Annotations | [`offlineFirstAnnotationRepository.ts`](../src/features/readmission/offline/offlineFirstAnnotationRepository.ts) | Local-first save/submit + outbox |
| Checkpoint | [`annotationCheckpoint.ts`](../src/features/readmission/offline/annotationCheckpoint.ts) | Debounced IDB write after highlights (crash safety) |
| Sync | [`SyncEngine.ts`](../src/features/readmission/offline/SyncEngine.ts) | Drain outbox to Supabase when online |
| UI | [`SyncProvider.tsx`](../src/features/readmission/offline/SyncProvider.tsx) | Bootstrap, connectivity, pending count |

## Data flow

1. **Login (online)** — `SyncProvider` runs bootstrap → fills IDB.
2. **Review (offline)** — Notes and annotations load from IDB; edits update memory + checkpoint to IDB.
3. **Save draft / Submit** — Write working copy + append outbox op; UI succeeds immediately.
4. **Reconnect** — `SyncEngine.flushSyncOutbox()` replays ops to Supabase in order.

## Load precedence

1. Local `working_annotations` when `noteVersionHash` matches case.
2. If online and not `pendingSync`, merge from server when server `updatedAt` is newer.
3. Else empty annotation with preset groups (hook).

## Safety rules

- Never overwrite local rows with `pendingSync: true` from server.
- `note_version_hash` mismatch → return null / stale (no silent merge).
- Outbox uses `prepareAnnotationForPersist` payloads only for network; full annotation stays in IDB.
- Submit offline: local status `submitted` + queued `submit` op (product choice).

## Clinician notes

- JWT may expire offline; re-login required when session ends.
- “Pending sync” dot on queue cards until flush succeeds.
- Use **Sync now** in the header when online with pending ops.

## Future

- `client_revision` column on `annotations` for idempotent retries
- Batch bootstrap RPC
- Service worker for static assets only
