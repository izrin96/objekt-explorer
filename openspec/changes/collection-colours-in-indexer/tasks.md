# Tasks

The branch is unmerged and undeployed, so this change edits the admin-area code in place. Never run `git stash`. A step that writes to production stops for the user's explicit approval of that step.

## 1. Indexer schema

- [x] 1.1 Write `packages/db/indexer-migrations/<timestamp>_collection_colour_source/migration.sql` by hand, idempotent:
  - add `source_text_color` and `source_background_color` (nullable `text`) with `ADD COLUMN IF NOT EXISTS`;
  - add `collection_staff_colors` only when `pg_constraint` lacks it (a `DO` block), so a hand-applied run makes the file a true no-op at the indexer's next start: `ADD CONSTRAINT … CHECK ((source_text_color IS NULL OR text_color ~ '^#[0-9a-f]{6}$') AND (source_background_color IS NULL OR background_color ~ '^#[0-9a-f]{6}$'))`.

  Mirror both columns and the check in `packages/db/src/indexer/schema.ts`. Add both columns to `apps/indexer/schema.graphql` and the TypeORM model `apps/indexer/src/model/generated/collection.model.ts` as nullable text, like the `processed*` columns, with no Subsquid migration (design, Decision 1). Verify: `@repo/db` lint, typecheck and build pass.

## 2. Shared colour code in `@repo/lib`

- [x] 2.1 Add the pure `packages/lib/src/collection-colours.ts`:
  - `planColourWrite(row, input)`: per colour, a value sets it and keeps the first source, `null` resets, absent leaves it; it returns the column set and the audit `before` and `after` in today's override shape;
  - `planReplay(row, after)`: the set that brings a row to an audit entry's `after`, or none when it already matches.

  Write `collection-colours.test.ts` first. It covers: set on a clean row, set twice keeping the first source, reset, reset one of two, reset with no override, a malformed source (`#7328D`) kept as given, and replay over a rebuilt row. Verify: `bun test` and lint, typecheck and build for `@repo/lib`.
- [x] 2.2 Add `packages/lib/src/server/collection-colours.ts`, importing only `@repo/db/indexer`:
  - lock and read a row (`SET LOCAL lock_timeout = '5s'`, then `SELECT … FOR UPDATE` by slug);
  - write a planned set, touching only the four colour columns.

  Verify: lint, typecheck and build for `@repo/lib`. Confirm with `bun run knip` that it is imported from both api and worker once groups 4 and 6 land.

## 3. Public reads lose the override map

- [x] 3.1 Return `overrideCollection(collection)` and `mapOwnedObjekt(objekt, collection)` to `main`'s signatures with no map. Delete `CollectionOverride`, `CollectionOverrides`, `collection-override.ts`, `collection-override-copy.ts` and `collection-override-copy.test.ts`. Trim `objekt.test.ts` to the band-image and field cases. Verify: `bun test`, lint, typecheck and build for `@repo/lib`.
- [x] 3.2 Drop `loadCollectionOverrides` from these callers and pass no map:
  - `owned.ts`, keeping the `held-by:v3` key and its row caching, but deleting its source-colour comment;
  - `transfers.ts`, `activity-feed.ts` and `activity-batch.ts`;
  - `list/read.ts`, `list/collections.ts` and `list/entry-view.ts`;
  - `collection.ts` (`queryCollections`).

  Verify: `grep -rn loadCollectionOverrides apps packages` finds nothing; lint, typecheck and build for `@repo/api` and `worker`.
- [x] 3.3 In `services/collection.ts`, remove `freshAfter`, `fresh`, `BuiltList` and the fallback eviction from `getFullList` and `fetchCollectionList`. Keep `bumpCollectionList`, `collectionListModifiedAt` and the 5-minute TTL. In `routers/collections.ts`, remove the `no-store` branch.

  Verify:
  - lint, typecheck and build for `@repo/api` and `web`;
  - with the dev server on production read-only, `GET /api/collection` returns 200 with Last-Modified, and a repeat carrying `If-Modified-Since` returns 304.

## 4. Staff save, reset and reads

- [x] 4.1 Rewrite `setCollectionColors` in `services/admin/collections.ts` in the order of design Decision 3:
  1. open the indexer transaction, lock the row, and refuse `admin_collection_not_found` when there is none;
  2. plan and update;
  3. insert and commit the `collection_override` audit entry in its own app transaction;
  4. commit the indexer transaction;
  5. then `bumpCollectionList()`, and delete `held-by:v3:<Addresses.SPIN>` through `redisFailOpen`.

  Return `{ refreshed }` as now. Verify:
  - lint, typecheck and build for `@repo/api`;
  - read-only verified: locally the save fails at the lock with SQLSTATE 25006 and writes nothing, and the request the page sends matches `setCollectionColorsInputSchema`.
  - Plan note: until task 7.1 the production indexer has no source columns, so a local save stops one step earlier, at SQLSTATE 42703 on the lock's `SELECT`, still writing nothing. The lock, plan and write were run instead against a temporary `collection` table in a rolled-back transaction on the local Postgres.
- [x] 4.2 Rewrite `collectionOverrides` and `collectionColors` to read the changed rows and the source values from the indexer, and who and when from the latest audit entry per slug (`DISTINCT ON (detail->>'slug')`, design Decision 5). Keep each output shape, except that `updatedAt` is null for a changed row with no history (the procedures have no `.output()` schema). In `apps/web/src/features/moderation/collections/view-row.tsx`, draw `<When>` only when `updatedAt` is set, so such a row names no one and shows no time. Order Overrides only by `updatedAt DESC NULLS LAST`.

  Verify:
  - lint, typecheck and build for `@repo/api` and `web`; `vercel-react-best-practices` is loaded before the `.tsx` edit;
  - against production read-only, `/mod/collections` loads and Overrides only reads "every collection shows the source's colours" (no row is changed yet).
  - Plan note: this check needs task 7.1, since both reads select the source columns and fail with 42703 before then. It moves to after 7.1. The audit read (`DISTINCT ON`) was run against the local app database after task 5.2.

## 5. App database

- [x] 5.1 Remove `collectionOverride` and `CollectionOverrideRow` from `packages/db/src/schema.ts`. Run `bun run --filter=@repo/db db:generate`. In the generated SQL, put the `INSERT INTO mod_audit … SELECT … FROM collection_override` of design Decision 7 before the drop, and guard both with one `DO` block on `to_regclass('public.collection_override')`. Leave `20261104062659` untouched.

  Verify: lint, typecheck and build for `@repo/db`; a second `db:generate` finds no diff.
- [x] 5.2 Apply it to the local app database (`db:migrate`, with `.env.local` on localhost). No package code changes here, so lint, typecheck and build stand as task 5.1 left them. Verify, locally only: `collection_override` is gone, and `mod_audit` holds one `collection_override` entry per former row, whose `after` matches it.

## 6. Replay script

- [x] 6.1 Add `apps/worker/src/script/replay-collection-colours.ts`, a dry run until `APPLY=1` (design Decision 8). It:
  - reads the latest entry per slug from the app database;
  - for each slug, runs `planReplay` and prints slug, current colours and target. A dry run reads with a plain `SELECT`, so it runs on a read-only connection. Only `APPLY=1` locks the row, re-plans under the lock and writes;
  - reports slugs no collection has, and rows with a source but no history;
  - after any write, sets `collection:modified-at` through `nextModifiedAt`.

  Verify: lint, typecheck and build for `worker`. A dry run with `PGOPTIONS='-c default_transaction_read_only=on'` against production lists nothing to do before task 7.2, and against the local app database plus a production read-only indexer lists the 16 slugs.
  - Plan note: both dry runs read the source columns, so they need task 7.1 and fail with 42703 before it. The first becomes task 7.3; the second runs after 7.1.

## 7. Production rollout (each step stops for approval)

No package code changes in this group: lint, typecheck and build stand as groups 1 to 6 left them.


- [ ] 7.1 **Stop for approval.** Then the user applies the indexer migration (task 1.1) to production by hand, or restarts the indexer from this branch. The file guards every ALTER behind an existence check and sets `lock_timeout` to 5 s itself, so a rerun takes no lock and a busy `collection` makes the indexer exit and retry on restart. Verify, read-only, that both columns and the check exist and every source is null. Then run, read-only, the checks tasks 4.2 and 6.1 deferred until the columns exist:
  - a dev server on the production read-only indexer loads `/mod/collections`, and Overrides only reads "every collection shows the source's colours";
  - the replay dry run against the local app database plus the production read-only indexer lists the 16 slugs;
  - the replay dry run against production (`.env` only, `PGOPTIONS='-c default_transaction_read_only=on'`) lists nothing to do.
- [ ] 7.2 **Stop for approval.** Then the user applies the app migrations (`20261104062659` and task 5.1's) to production before any deploy, at a quiet time: both set `lock_timeout` to 3 s (the drop takes ACCESS EXCLUSIVE on `"user"` when it removes the foreign key), so a busy table makes the run fail and roll back rather than queue sign-ins; rerun it. Verify, read-only, that `collection_override` is absent and 16 `collection_override` audit entries exist with no actor.
- [ ] 7.3 Run the replay dry run against production read-only and show the user the 16 planned rows.
- [ ] 7.4 **Stop for approval.** Then run the replay with `APPLY=1` against production. Verify, read-only, that the 16 rows carry the colours and their sources, and that `main` still shows the same colours.
- [ ] 7.5 Only after 7.4: the user deploys web and worker. Verify that `/mod/collections` Overrides only lists the 16 with no one named, and that the collection page shows the seeded colours.

## 8. Documentation

- [x] 8.1 Update these `AGENTS.md` files, then run `bun run check` and `bun run build`:
  - **Root:** the indexer schema is written by the indexer, the worker, and the web for `collection` colours.
  - **`packages/db`:**
    - replace "Collection overrides" with the source columns and the `collection_staff_colors` check;
    - note that "read from this side" now has one web writer;
    - note that `.env.local`'s read-only indexer is the guard against local saves.
  - **`packages/api`:** rewrite "Objekt shapes":
    - no override map;
    - colours come from the row;
    - the save's cross-database order;
    - `held-by:v3` deleted on save;
    - the bump.
  - **`apps/indexer`:**
    - the batch must stay SERIALIZABLE or REPEATABLE READ, since staff colour saves rely on it;
    - the source columns are in `schema.graphql` and the model, set by nothing in the indexer;
    - never write `text_color` or `background_color` for an existing row while its source column is set: `collection_staff_colors` would fail the batch on every retry (for example, adding a colour to `collectionFields`);
    - a resync is followed by `replay-collection-colours.ts`.
  - **`apps/worker`:** the replay script, with its dry run and when to run it.
  - **`apps/web`:** no change.

## Workflow follow-up

- Optional, the user's own step: a narrower `web_indexer` role (design Decision 10).
- Optional follow-up for agreement: split the indexer's collection save into an INSERT for new rows and a column-list UPDATE for changed ones, so it never writes colour columns back.
- Archive after review, folding the delta into `openspec/specs/web-admin/spec.md`.
