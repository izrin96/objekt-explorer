# Tasks

## 1. Schema

- [x] 1.1 Add `hiddenTradePost` to `packages/db/src/schema.ts`, with `(user_id, list_id)` primary key, cascades and a `list_id` index, plus its relations. Generate the migration with `bun run --filter=@repo/db db:generate` and check that the SQL only creates the table and index. Lint, typecheck and build `@repo/db`.
- [x] 1.2 Ask the user for approval before running `db:migrate` against the local database (`.env.local`). Never run it against production. Verify that the table exists locally with `\d hidden_trade_post`.

## 2. API

- [x] 2.1 Pull the pairing rule into one SQL helper in `packages/api/src/services/trade/lists.ts`. The rule: a have or sale list that offers swaps leads its linked want list of the same owner. Make `postsCte` (`feed/query.ts`) and `partner_post` (`matches/candidates.ts`) both use it. Behaviour must not change:
  - the existing `bun test` suites pass;
  - a read-only comparison of the posts and `post_key` rows before and after, on the local database, shows the same rows.

  Lint, typecheck and build `@repo/api`.
- [x] 2.2 Add `postHiddenSql(viewer, alias)` to `packages/api/src/services/trade/lists.ts`, built on the pairing helper from 2.1. Then:
  - apply it in `feedWhere`;
  - apply it in `candidates.ts` behind a `skipHiddenPosts` option that defaults on.

  Verify with a read-only `EXPLAIN` of the candidates query against the local database. Lint, typecheck and build `@repo/api`.
- [x] 2.3 Add `hidePost`, `unhidePost` and `fetchHiddenPosts` to `services/trade/hidden.ts`, and `trade.hidePost`, `trade.unhidePost` and `trade.hiddenPosts` to `routers/trade.ts`.
  - `hidePost` is a no-op for the caller's own list, a list that leads no post, or one off Trade.
  - Each write calls `bumpTradeVersions`.
  - Verify against the local database through the dev server, and record it as read-only verified for production. Lint, typecheck and build.
- [x] 2.4 Add `skipHiddenPosts` to `FeedQuery`. Set it to false when the query is scoped to one person (`person` in the search), have `feedWhere` and the candidates call honour it, and return `hidden` on each post. Verify locally that a person whose posts are all hidden still shows their row on `/trade/@<handle>`, and that Browse drops it. Lint, typecheck and build.

## 3. Worker

- [x] 3.1 In `apps/worker/src/job/want-alerts/pairs.ts`, skip a pair whose partner list belongs to a post the recipient hid, in both directions. Verify by running the pairs query against local data with a hidden post. Lint, typecheck and build `worker`.

## 4. Web

- [x] 4.1 Add the en/ko/ja messages: Hide post, Unhide post, the toast, the errors, Hidden posts, the empty text, and the footer note wording. ko and ja follow the register rules. Run `bun run paraglide:compile`, then lint, typecheck and build `web`.
- [x] 4.2 Add `useHidePostWithUndo` and `useUnhidePost` to `apps/web/src/features/trade/actions.ts`, with an optimistic drop of the post, and of its row once it is empty, from the `trade.people` cache. Add a `hiddenPostsOptions` query to `queries.ts`. Lint, typecheck and build `web`.
- [x] 4.3 Add Hide post, or Unhide post when the post is hidden, to `PostBlock`'s menu for a signed-in non-owner. Check in the running app:
  - the post leaves Browse;
  - Undo brings it back;
  - the person page shows Unhide post.

  Lint, typecheck and build.
- [x] 4.4 Add `HiddenPostsList` beside `HiddenPartnersList` in the Hidden dialog and in Account's `HiddenPanel`, and show the Browse footer note when either list has items. Check in the running app that Unhide from `/account/hidden` brings the post back. Lint, typecheck and build.

## 5. Integration

- [x] 5.1 Run `bun run check` and `bun run build`. Then run one browser pass covering:
  - hiding one of two posts, so the lead post changes;
  - hiding the last post, so the row leaves;
  - hiding then unhiding the person, so the hidden post stays hidden;
  - unhiding from the dialog.
- [x] 5.2 Update the `AGENTS.md` files. In `packages/api/AGENTS.md` and `apps/worker/AGENTS.md`, note that a Trade read or alert that applies `tradePartnerSql` must also apply `postHiddenSql`. Say that `apps/web` and `packages/db` conventions did not change. Verify that each edited file states the rule.
