## Why

A post's own Trade state is stored on its lists: `lists.discoverable` (on Trade), `bumped_at`, a want list's Open to (`match_have`, `match_sale`) and a sale list's `takes_swaps`. Once one list can sit in two posts, the owner decided (2026-11-16) that each post keeps its own state, so a list can be on Trade in one post and off in another, with a different Open to in each. Step 1 of the shared-lists chain gives that state a place on `trade_post`, and the reads that build posts read it there. While a list is in at most one post, nothing a person sees changes.

## What Changes

- `trade_post` gains each post's state, stored per side because a row today can show one half and not the other: `lead_on_trade`, `want_on_trade`, `lead_bumped_at`, `want_bumped_at`, plus the post's want-side Open to (`match_have`, `match_sale`, checked by `trade_post_open_to_something`) and its sale lead's `takes_swaps`.
- The expand migration adds the columns and backfills them from the lists.
- **Deploy A:** every writer of the five list columns writes the rows too. `planPostWrite` derives each row's state from the lists in it after the write, as a pure, tested rule, so a new, re-led, merged or split row gets the state of the lists that land in it. `bumpPerson` takes the person's list lock and bumps rows in the same statement as lists.
- **Deploy B:** a reconcile migration re-runs the backfill. Then the reads that build posts and match against them switch to the rows: `postsCte`, `feedListColumns`, `trade.myPosts`, match candidates and the worker's want alerts. Readers that ask about a list as such stay on `lists`: the Marketplace, offers, chat cards, the list page and the viewer's own lists.
- The drift script gains two checks: a row's state must equal its lists' state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`. While a list is in at most one post, every switched read returns what it returned before, byte for byte, and every `/rpc` and `/api/v1` input and output is unchanged.

## Routes

No route changes. The changed reads sit behind `/trade` (Browse, For you, the person and post pages), `/trade/new` (`trade.savePost`, `trade.myPosts`), Take off Trade, Bump, and `/list` create, copy and delete.

## Non-goals

- **Letting a list sit in two posts, or the two halves of one post diverge from their lists.** Writers still decide state per list. Changes 3 and 7 of the chain make it per post.
- **Dropping any column from `lists`.** A later `trade-post-state-contract` change does that, after `trade-post-planner-shared` (design, Inputs for later phases). Open to and `takes_swaps` stay on `lists` for good, as the list's own value off Trade. `discoverable`'s future is an owner question.
- **Hides, post ids as inputs, offers.** These are other changes in the chain. `fetchHiddenPosts` is left to `trade-post-hides-by-row`.
- **Any `.tsx`, string or `trade:*` cache-key change.** No cached shape changes.

## Impact

- `packages/db`: `schema.ts`, two migrations (expand with backfill, then the reconcile).
- `packages/api`:
  - `lib/trade-post-rows.ts` and its two tests, `lib/trade-sql.ts` and its test;
  - `services/list/shared.ts`, `create.ts` and `edit.ts`;
  - `services/trade/post.ts`, `feed/query.ts`, `feed/entries.ts`, `feed/mine.ts`, `matches/candidates.ts`, `trade/lists.ts`.
- `apps/worker`: `job/want-alerts/pairs.ts` and the drift script. The worker image must be rebuilt for deploy B.
- `apps/web`: none. Docs: `docs/trade.md`, `docs/lists.md`, the db and worker `AGENTS.md`.
- **Deploy order:** migration A, then web A. After that, migration B, a read-only production drift run that must read zero, then web B and worker B.
- **Rollback:** web B to web A at any time; after migration B, web A is the floor (design decision 12).
