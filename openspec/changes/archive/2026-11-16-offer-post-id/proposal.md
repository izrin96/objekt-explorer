## Why

Since `trade-post-stable-ids` a post keeps its `trade_post.id` while it stays one post, so a row id can be stored as a post's address. Later features need offers to name a post that way: per-post offer rules, pausing a post, a note on a post. Today an offer names only the list it was made on, `offer.post_list_id`. This change stores the post's row id beside it. Nothing reads the new column yet.

## What Changes

- `offer.post_id`: a nullable foreign key to `trade_post(id)`, `ON DELETE SET NULL`, with a partial index on the non-null values.
- `createOffer` stores `post_id` whenever it stores `post_list_id`: the lowest `trade_post.id` that list leads, resolved inside the `INSERT` statement. It stays NULL when `post_list_id` is NULL.
- The expand migration adds the column, the foreign key and the index, and backfills existing offers by the same rule. Production on 2026-11-16 would get 2,003 set and 68 left NULL.
- `post_list_id` stays for good. Every reader stays on it, because in three planner cases a row id is the wrong answer for an offer's history (design decision 3).
- The drift script gains one check that must read zero (the post belongs to the offer's recipient) and two counts it prints without failing.
- Docs: `packages/api/docs/offers.md`, `packages/db/AGENTS.md`, `apps/worker/AGENTS.md`, and the `schema.ts` doc comments.

## Non-goals

- **Hides.** `hidden_trade_post` keeps naming a list. Pointing a hide at a row would change three shipped behaviours and would need hides moved on every merge. Nothing planned needs it before shared lists. The owner chose this on 2026-11-16.
- **Any reader of `post_id`.** `acrossPosts`, the decline notice, Only offers with what I want, the offer card and reports read what they read today.
- **Inputs, outputs and URLs.** `offer.create` still takes a list slug as `post`. Offer views still return `post: { slug, name } | null`. No URL carries a post id.
- **Renaming `post_list_id`.** It is the offer's history and keeps its name.
- **Reconciling offers created between the migration and the web deploy.** The first change that reads `post_id` carries that reconcile (design, Inputs for later phases).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`. Users, open tabs and `/api/v1` see nothing new: every offer view, refusal and notice reads what it read before. The offer router is `/rpc` only, and its inputs and outputs do not change.

## Routes

No route changes.

## Impact

- `packages/db/src/schema.ts` and one new migration folder.
- `packages/api/src/services/offer/index.ts` (`createOffer`'s insert).
- `apps/worker/src/script/trade-post-drift.ts`.
- Docs as above.
- Deploy order: the migration, then web. The worker runs none of the changed code.
- Rollback: any web or worker build from `c66841be` on can run against the migrated database, including the build before this change. None of them names `post_id`, so their inserts leave it NULL, and nothing reads it. The migration needs no undo: the column is additive, and dropping it later is a contract migration of its own. Design, Migration Plan, has the locks and the rollback window.
