## Why

Every bump lives on the `trade_post` rows, and `lists.bumped_at` is only a copy derived from them. A per-list copy can't say which post a shared list was bumped in, so it goes before `shared-lists`. Change 4 of the shared-lists chain.

## What Changes

- **Bump times are read from the rows.** The person's last bump (`personBumpedAt`, behind `turnOnBumpedAt`) and `lastBumpOf` become the latest bump among the person's `trade_post` sides, on Trade or not.
- **Bump bumps the sides on Trade.** `bumpPerson` bumps each on-Trade side of the person's rows, checks the cooldown against the rows, and no longer writes `lists`.
- **`lists.bumped_at` stops being read or written.** The planner, `writePosts`, `writeList`'s insert and `postStateSql`'s fallback all drop it.
- **BREAKING: list objects lose `bumpedAt`.** `PublicList.bumpedAt` leaves `list.findPublic`, `list.find` and `profiles.lists`, on `/rpc` and `/api/v1` (the owner's product decision of 2026-11-21). The web reads no list's bump. A feed post's `bumpedAt` stays.
- **`hidden_trade_post.list_id` goes too.** Nothing has read it since `trade-post-hides-by-row`. Step 1 stops writing it and drops drift note 3, its last reader. Step 2 drops it with its index, its fill trigger and that trigger's function.
- **The columns are dropped in two steps.** Step 1 ships the code with a migration that leaves both columns in place. Step 2 is a later migration that drops them, once no live build uses them.
- **The indexes.** `lists_trade_feed_idx` (keyed on `bumped_at`, read only by the Marketplace) and `lists_trade_discoverable_idx` (read by nothing) become one `lists (list_type) WHERE discoverable` index in step 1, under the second one's name.
- **Drift:** check 5 keeps only its `discoverable` half, and note 3 goes.
- **`lists.discoverable` stays,** derived by `writePosts`. Its readers move in `trade-post-reads-by-row` or later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`, Bump: a bump held only by a want list that has since left every post no longer counts toward the person's last bump (design decision 2, accepted by the owner). With one row per list, every other bump, cooldown and turn-on behaves as it does today.
- `api-openapi`: a new requirement, that list objects carry no `bumpedAt`. Stable contracts covers reorganizing schemas, not a decided output change, so it stays as it is.

Checked and unchanged: `web-lists` (which defers to Bump), `web-trade-person-pages`, `web-trade-for-you`.

## Routes

- Bump and Your posts: `trade.bump`, `trade.myPosts` (`lastBumpAt`, `nextBumpAt`).
- Turning a post on: `trade.savePost`, `list.create`, `list.copy`.
- List reads: `list.findPublic`, `list.find`, `profiles.lists`, `GET /api/v1/lists/{slug}` and `GET /api/v1/profiles/{address}/lists` (`bumpedAt` removed).
- Hides: `trade.hidePost`, and the hide moves in `writePosts`.
- The worker's drift script.

## Non-goals

- **Moving the other `lists` readers to rows** (`trade-post-reads-by-row`), and dropping `lists.discoverable`.
- **Lifting `planPost`'s one-row-per-list refusal** (`shared-lists`).
- **Any `.tsx`, message, `/rpc` input or cache-key change.** Removing `bumpedAt` is an output change only.
- **A per-post Bump.** Bump stays per person.

## Impact

- `packages/api`:
  - `lib/trade-sql.ts`, `lib/trade-post-rows.ts` and their tests, including the model test;
  - `schemas/list.ts`;
  - `services/list/shared.ts`, `create.ts` and `read.ts`;
  - `services/trade/feed/mine.ts` and `services/trade/hidden.ts`;
  - `docs/trade.md`.
- `packages/db`: `schema.ts`, two migrations, `AGENTS.md`.
- `apps/worker`: the drift script, `AGENTS.md`.
- **Deploy:**
  - Step 1: migrate, then web and worker from one commit.
  - Step 2: a migrate run on its own, once both run step 1.
  - Each step has a read-only drift gate before and after it.
- **Rollback:**
  - After step 1: the previous images (`6f4de4c2`), followed by one reconcile statement, which the owner approved for that case only. No web build older than `1a062e41` (`trade-post-hides-by-row`) may run from step 1 on.
  - After step 2: nothing older than step 1.
