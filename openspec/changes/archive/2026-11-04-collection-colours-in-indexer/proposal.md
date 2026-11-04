# Proposal

## Why

Staff colour fixes live in the app database (`collection_override`), so every read that returns collections also reads the app database, through a per-process cache, a freshness protocol and a fallback path. The production indexer database is writable, and Cosmo's v1 metadata, the only source that ever carried a text colour, is gone, so nothing upstream will overwrite a colour set on the collection row itself.

The admin area has not shipped: `main` has neither the table nor its migration, and production's app database has no `collection_override`. This change reshapes the unmerged branch before it ships.

## What Changes

- **Colours live on the collection row.** A save writes `text_color` and `background_color` on the indexer's `collection` row. The first time staff change a colour, its source value is kept beside it (`source_text_color`, `source_background_color`, both nullable). Reset copies the source back and clears it.
- **Public reads use one database.** `overrideCollection` and `mapOwnedObjekt` lose their map argument. The override loader, its per-process copy, `freshAfter` and the list's `no-store` fallback go.
- **The audit is the history.** Each save or reset still writes a `collection_override` audit entry, and "who changed it last" reads the latest one per slug. Which collections are changed, and their source values, read the indexer row.
- **Reindex recovery.** A worker script replays the latest audit entry per slug onto the indexer, a dry run until `APPLY=1`. The same script moves today's 16 colours into production before the deploy.
- **`collection_override` is dropped before it ships.** A new app migration copies its rows into the audit as entries with no admin named, then drops the table. Production creates and drops it in one migrate run.
- **Indexer schema.** It gains a Drizzle-owned migration with the two source columns and a CHECK that a staff-set colour is lowercase `#` plus six hex digits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin`: overrides are stored on the indexed collection instead of apart from it. A reindex from scratch loses them until the replay runs. Reset restores the kept source value, and Overrides only reads the changed rows. Moderator refusals name colours, not overrides.

## Non-goals

- Changing how the indexer saves a collection (`handleCollection`, its upsert). Its SERIALIZABLE batch already keeps a concurrent staff edit; see design.
- Band images, other collection fields, or the Collections tab's layout and inputs.
- A narrower database role for the web. Design recommends it as a manual step for the user.
- Recolouring open tabs. A save shows on each page's next load, as before.

## Routes

- `/mod/collections`: same table and procedures, new storage behind them.
- Every page showing collection colours (`/`, `/@<profile>`, lists, Trade, activity): only where they are read changes.

## Impact

- `packages/db`:
  - an indexer migration plus its schema mirror;
  - an app migration that turns `collection_override` rows into audit entries and drops the table;
  - `collectionOverride` leaves `schema.ts`.
- `packages/lib`: the loader, its copy module and test, and the map types go. A pure colour-write planner (tested) and an env-free indexer writer are added, shared with the worker.
- `packages/api`:
  - `services/admin/collections.ts` is rewritten;
  - `fetchCollectionList` and the former loader callers get simpler;
  - `routers/collections.ts` loses its `no-store` branch.
- `apps/worker`: a new `script/replay-collection-colours.ts`.
- `apps/web`: the Collections row shows a change's time only when there is one; no route change.
- Operations: three approvals, in order: the indexer migration, the app migration, then the replay with `APPLY=1` on production.
- Docs: the `AGENTS.md` of the root, `packages/db`, `packages/api`, `apps/indexer` and `apps/worker` stop calling the indexer read-only for the web.
