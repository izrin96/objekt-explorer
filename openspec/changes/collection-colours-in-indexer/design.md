# Design

## Context

See proposal.md (Why) and `specs/web-admin/spec.md` for behaviour. Facts read from the code and, read-only, from production on 2026-11-04:

- **Branch state.**
  - `git log main..feat/admin-area` holds `53758ce0`, `0f23006c` and `c4725c72`, and nothing on `main` has `20261104062659_admin_collections_and_banners`.
  - Production's app database has no `collection_override` and no `collection_*` audit entries (`mod_audit` holds 6 rows).
  - `main` still applies the hardcoded 16-entry map in `packages/lib/src/server/objekt.ts`.
  - The local app database has applied `20261104062659` (recorded in `drizzle.__drizzle_migrations`; the table holds 16 rows).
- **The indexer's save.** `handleCollection` (`apps/indexer/src/main.ts`) loads the whole `Collection` entity, `Object.assign`s `collectionFields` (no colours) when `collectionChanged`, and the batch calls `ctx.store.upsert`.
  - Subsquid's `Store.upsert` calls TypeORM's `EntityManager.upsert(…, ['id'])`, whose overwrite set is every model column that any entity in the batch defines (`typeorm/entity-manager/EntityManager.js`, the `overwriteColumns` filter). A loaded entity defines all of them.
  - So re-saving a known collection writes `text_color`, `background_color`, `processed_*` and `serial_*` back with the values it loaded.
- **The indexer's transaction.** `new TypeormDatabase({ supportHotBlocks: true })` sets no isolation level, so each batch runs in `SERIALIZABLE` (`@subsquid/typeorm-store/lib/database.js`). `submit` reruns the whole batch callback, reads included, on SQLSTATE 40001, up to 3 times.
  - PostgreSQL: "a repeatable read transaction cannot modify or lock rows changed by other transactions after the repeatable read transaction began" (docs/18, transaction-iso.html); SERIALIZABLE includes this.
- **Hot blocks.** `ChangeTracker.trackUpsert` records the row's pre-image with `SELECT *`, so every column, Drizzle-owned ones included. `rollbackBlock` writes all of it back on a reorg.
- **Other writers of `collection`.**
  - The worker's `ensureCollection` inserts with `onConflictDoNothing`.
  - `process-collection-images` and the serial jobs and scripts update their own columns only.
  - Nothing else writes a colour of an existing row.
- **Source colours are not reproducible.**
  - `getTextColor(class, collectionNo)` disagrees with the stored `text_color` on 4,735 of 16,606 collections: v1-era rows carry real v1 values.
  - The v3 `background_color` is never refetched for a known collection.
  - 20 rows hold a colour that is not 6 hex digits (`ever01-seoyeon-338z` has `#7328D`), and 5,168 text and 12,214 background values are uppercase.
- **Access.** The web and the worker reach the production indexer as `postgres`, a superuser that owns `collection`. Both production databases run PostgreSQL 18, and so does compose.

## Goals / Non-Goals

**Goals:**
- A public read touches the app database only where it did before the admin area: no read loads colours from it.
- A staff save cannot be lost to a concurrent indexer save.
- Reset restores the exact value the collection had before staff first changed it.
- One tool both seeds production and recovers a reindex.

**Non-Goals:**
- Changing `handleCollection`, the TypeORM model's existing columns or the batch upsert.
- A trigger or other database-side logic on the indexer.
- Keeping every intermediate colour on the row. The audit already holds each change.

## Decisions

**1. Store the colour on the row, and keep the source beside it on the same row.**

The indexer migration adds `source_text_color` and `source_background_color`, both nullable `text` with no default. A null source means the source applies. A non-null source means staff override that colour, and the source holds the value it replaced, as given.

A CHECK, `collection_staff_colors`, added only when `pg_constraint` lacks it, requires a colour whose source is set to match `^#[0-9a-f]{6}$`. The source column itself is unchecked, since source values are malformed in 20 rows.

The columns are also in `schema.graphql` and the TypeORM model, as the Drizzle-added `processed*` columns are, so a Subsquid migration generated from the model never proposes dropping them. The indexer sets neither: a new row starts null, and the upsert of a loaded row writes back the values it read, under the same SERIALIZABLE retry that keeps a staff colour. The hot-block pre-image (`SELECT *`) still carries them, so a rollback restores colour and source together.

Rejected alternatives:
- **Recompute the source** with `getTextColor`: it is wrong for 28% of rows, and it cannot recompute a background at all.
- **The earliest audit `before` per slug**: Reset and Overrides only would then depend on a second database and on a complete audit, and the seeded rows would need literal source values.
- **A slim app-database originals table**: that rebuilds `collection_override` in reverse, with the same two-database reads on the staff side.

**2. The web writes four columns of a locked row; the indexer is unchanged.**

A save or reset runs in one indexer transaction:
1. `SET LOCAL lock_timeout = '5s'`.
2. `SELECT slug, text_color, background_color, source_text_color, source_background_color FROM collection WHERE slug = $1 FOR UPDATE`. No row refuses `admin_collection_not_found`.
3. The pure planner sets each colour in the input:
   - a value: `x = v`, `source_x = coalesce(source_x, x)`;
   - `null` (reset): `x = coalesce(source_x, x)`, `source_x = null`;
   - absent: untouched.
4. `UPDATE collection SET <those columns only> WHERE slug = $1`.

The race (question 1) is already closed.
- **Staff commit first.** If a staff UPDATE commits after the indexer's batch began, the batch's upsert of that row fails with 40001. Subsquid reruns the batch, which reloads the row with the staff colour, then saves.
- **The indexer locks first.** The web's statement waits, then applies to the new version under READ COMMITTED.

The same rule already protects the worker's `serial_anchors` and image writes on this row.

Making the upsert skip colour columns for existing rows was rejected:
- `overwriteColumns` spans the batch. A new collection defines `textColor`, so a known row without it would be overwritten with the column default.
- A partial entity fails NOT NULL on the proposed row before the conflict check.
- The real fix is splitting new from changed rows into an INSERT and a column-list UPDATE. That is a broader indexer change, which `apps/indexer/AGENTS.md` asks to agree first, so it is offered as an optional follow-up.

The invariant to record: the indexer's batch stays SERIALIZABLE or REPEATABLE READ.

**3. The cross-database order: audit inside the indexer lock.**

After step 4 and before the indexer commits, the save inserts the audit entry in its own app-database transaction and commits it. Then it commits the indexer transaction. After both:
- `bumpCollectionList()`;
- a delete of `held-by:v3:<spin address>` (Decision 6).

What each failure leaves:
- **The audit insert fails.** The indexer rolls back and nothing is stored (spec: History unavailable).
- **The indexer commit fails after the audit committed.** This needs a dropped connection at commit, so it is rare. The history then lists a change the row lacks. The replay would apply it, which is what staff asked for. It is logged as an error.

The reverse order, indexer first, would leave a stored colour with no history, invisible to the replay. The audit keeps today's shape: `{ slug, before, after }`, where each colour is the override or null for the source.

**4. Shared, env-free code in `@repo/lib`.**
- `src/collection-colours.ts` (pure, with a test):
  - `planColourWrite(row, input)` gives the column set and the audit `before` and `after`;
  - `planReplay(row, after)` gives the set that brings a row to an audit entry's `after`, or none.
- `src/server/collection-colours.ts` imports only `@repo/db/indexer`. It locks and reads a row, and writes a set.

The API service and the worker script both use them. This takes the place `collection-override.ts` held, for the same reason: the worker cannot reach `env.ts`.

**5. Reads.**

Public reads:
- `overrideCollection(collection)` and `mapOwnedObjekt(objekt, collection)` return to `main`'s signatures and read the row's colours.
- `CollectionOverride`, `CollectionOverrides`, `loadCollectionOverrides`, `collection-override-copy.ts` and its test are deleted.
- Every service and `activity-batch.ts` drops its `Promise.all` with the loader.
- `fetchCollectionList` drops `freshAfter`, `fresh` and the `BuiltList` wrapper.
- `routers/collections.ts` drops its `no-store` branch.

Staff reads:
- `admin.collectionOverrides` reads the changed rows from the indexer: `WHERE source_text_color IS NOT NULL OR source_background_color IS NOT NULL`. That is a sequential scan of 16.6k rows, so no index.
- It reads the latest entry per slug from the app database: `SELECT DISTINCT ON (detail->>'slug') … WHERE action = 'collection_override' AND detail->>'slug' = ANY($1) ORDER BY detail->>'slug', created_at DESC, id DESC`.
  - No index while `mod_audit` is this small.
  - Add a partial expression index on `(detail->>'slug', created_at DESC) WHERE action = 'collection_override'` if it reaches tens of thousands of rows.
- The output keeps its shape except that `updatedAt` becomes nullable. `view-row.tsx` then draws `<When>` only when there is a time; nothing else in the tab reads it:
  - `textColor` is `text_color` when its source is set, else null;
  - `source` is `coalesce(source_x, x)`;
  - `updatedBy` and `updatedAt` come from the audit, null when there is none, ordered `updatedAt DESC NULLS LAST`.
- `admin.collection` reads the same way.

**6. Caching (question 6).**
- **The `collection:modified-at` bump stays.** Last-Modified is the later of the newest `created_at` and the bump. An UPDATE moves neither, so without the bump a browser holding the list gets 304. With the bump, `getFullList` rebuilds from the updated rows, so the raw-millisecond `freshAfter` handshake has nothing left to guard.
- **`held-by:v3` stays.** It caches rows from `countHeld`, which now carry the staff colours. Its old reason, keeping source colours out of the cache, is gone, but its shape is unchanged.
  - Going back to `held-by:v2` is safe only with code identical to `main`'s, since `main`'s v2 entries sit in production Redis. Staying on v3 avoids that question.
  - Since the cache now holds coloured rows for 5 minutes, a save deletes Spin's key, so Spin's held list follows the spec's next-load rule.
  - No other cache holds `getCollectionColumns()` rows; those reads run live.

**7. App migration: drop the unshipped table through a new migration.**

`collectionOverride` leaves `schema.ts`, and `db:generate` writes the drop. Before the drop, prepend:

```sql
INSERT INTO "mod_audit" ("actor_id", "action", "target_user_id", "detail", "created_at")
SELECT "updated_by", 'collection_override', NULL,
  jsonb_build_object('slug', "slug",
    'before', jsonb_build_object('textColor', NULL, 'backgroundColor', NULL),
    'after', jsonb_build_object('textColor', "text_color", 'backgroundColor', "background_color")),
  now()
FROM "collection_override";
```

Then `DROP TABLE "collection_override"`, with both statements inside one `DO` block that runs only when `to_regclass('public.collection_override')` is not null. On production, `20261104062659` creates and seeds the table, and this migration turns its 16 rows into audit entries with no admin named and drops it, in one `db:migrate`.

Editing `20261104062659` in place was rejected. It breaks "never edit past migrations", and the local database has already recorded it, so local would keep the table and miss the audit rows. That leaves the banner index in it untouched.

**8. Replay script (question 4).** `apps/worker/src/script/replay-collection-colours.ts`:
1. Read the latest `collection_override` entry per slug from the app database.
2. For each slug, lock the indexer row, run `planReplay`, and print slug, current colours and target.
3. With `APPLY=1`, write the set. It writes no audit entry, since it restores history rather than adding to it.
4. Report:
   - slugs no collection has;
   - rows with a source set but no history.
5. When anything changed, write `collection:modified-at` the way `process-collection-images` does, through the pure `nextModifiedAt`.

The same script seeds production before the deploy (Migration Plan) and recovers a reindex from scratch. The 16 old values live in the seeded audit entries and in git (`main`'s `objekt.ts`, the `20261104062659` seed), not in code.

**9. Local development (question 7).**
- `.env.local` keeps the production indexer read-only, so a local save fails at its `SELECT … FOR UPDATE` with SQLSTATE 25006 and writes nothing. That setting is the guard: never drop it to test a save.
- Verification needs no local write:
  - the planner and replay tests;
  - the read paths, run for real;
  - the save and reset read-only verified up to the request boundary.
- For an end-to-end session on a local indexer:
  1. Start `postgres-indexer` from compose (127.0.0.1:5434).
  2. Apply the Subsquid and Drizzle indexer migrations to it. The user runs this if the `guard-prod-db` hook blocks it.
  3. Copy only the `collection` rows from production: `\copy (SELECT …) TO STDOUT` under `PGOPTIONS='-c default_transaction_read_only=on'`, piped into the local `\copy collection FROM STDIN`.
  4. Point `.env.local`'s `INDEXER_DATABASE_URL` at it for the session, then restore it.
- Profiles are empty there, but the Collections tab, save, reset, Overrides only, the bump and the replay all run.

**10. Permissions (question 8).** The web already holds superuser on the indexer, so this change adds no privilege. A narrower grant is recommended as the user's own step, since the web is the internet-facing process. That step:
- a `web_indexer` login role;
- `GRANT SELECT` on the indexer tables, and default privileges for new ones;
- `GRANT UPDATE (text_color, background_color, source_text_color, source_background_color) ON collection` (a column UPDATE privilege is enough for `SELECT … FOR UPDATE`);
- the web service's own `INDEXER_DATABASE_URL`, through pgbouncer-indexer's auth.

The worker keeps the writer role.

## Risks / Trade-offs

- [A reorg rolls back a hot block in which the indexer saved a collection that staff edited after it] → The pre-image restores colour and source together, so the row stays consistent, but the edit is gone. It needs a metadata change and an edit inside the hot window, so it is rare. The replay restores it.
- [The indexer's batch hits 40001 three times running on the same collection] → The processor stops and restarts. This needs three staff saves of one collection inside one batch's metadata change, so it is negligible.
- [A save waits behind an indexer batch holding the row] → `lock_timeout` is 5 s, then the save fails with the generic error and nothing is stored.
- [The indexer commit fails after the audit committed] → The history lists a change the row lacks (Decision 3). The replay's report shows it.
- [A reindex from scratch] → Colours are the source's until the replay runs (spec: Before the replay). Running the replay belongs in the resync runbook in `apps/indexer/AGENTS.md`.
- [A band image follows the edited background] → `getBandImageUrl` compares `backgroundColor === "#000000"`. It used to read the source and now reads the staff value. That only matters for idntt collections, and the band then matches the colour shown.
- [Rollback to `main`] → Safe. `main` applies its map over rows that already hold the same 16 values, and shows any later staff colour from the row. It ignores the source columns and the audit entries.
- [The seeded colours change case] → `main` serves `#07328D` and the row will hold `#07328d`. It is the same colour.

## Migration Plan

Each production step stops for the user's explicit approval:

1. **Indexer migration.** Applied by the user. Either:
   - by hand with `SET lock_timeout = '5s'`, retrying if it times out (the ALTER takes ACCESS EXCLUSIVE, and a long wait would queue every reader behind it). The file then runs as a no-op when the indexer next starts; or
   - by restarting the indexer from this branch.

   `main` ignores the columns.
2. **App migrations.** `20261104062659` and the drop migration, applied together before the deploy. `main` ignores both.
3. **Replay dry run** against production, read-only (`PGOPTIONS='-c default_transaction_read_only=on'`). Expect the 16 slugs, each with its target.
4. **Replay with `APPLY=1`** against production. `main` keeps showing the same 16 colours through its map, so there is no window of wrong colours.
5. **Read-only check** that the 16 rows carry the colours and their sources.
6. **Deploy** web and worker, in either order. Never deploy before step 4: the 16 collections would show source colours until the replay ran.
