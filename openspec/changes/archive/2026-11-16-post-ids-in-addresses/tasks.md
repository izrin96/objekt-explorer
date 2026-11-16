# Tasks

Read first: `packages/api/AGENTS.md` and `packages/api/docs/trade.md` (Trade posts). Tests run with `bun test` beside the code and touch no database, Redis or Cosmo API: the root `.env` is production. Run no `db:*` script and no migration. Commit nothing.

Every task ends with lint and typecheck passing for the package it touched: `bun run lint --filter=<pkg>` and `bun run typecheck --filter=<pkg>`, where `<pkg>` is `@repo/api`, plus `web` for its typecheck, since the web's types follow the API's outputs.

## 1. API: the post id on feed posts (A)

- [x] 1.1 Add `postRowOf(rows: readonly PostRow[], listId: number): PostId | null` to `packages/api/src/lib/trade-post-rows.ts`.
  - It returns the lowest `id` among rows whose `leadListId === listId`, else the lowest among rows whose `wantListId === listId`, else null.
  - One-line doc comment: "The row of the post a list is in: the lowest row it leads, else the lowest row it is the want list of."
  - Verify: in `trade-post-rows.test.ts`, `describe("postRowOf")` over the rows `{1000001: lead 1, want 2}`, `{1000002: lead 3}`, `{1000003: lead 4, want 5}`, `{1000004: lead 6}`, `{1000005: lead 6}`. The expected results:
    - 1 → 1000001 and 2 → 1000001;
    - 3 → 1000002;
    - 5 → 1000003;
    - 6 → 1000004;
    - 7 → null.
- [x] 1.2 Add `postRowSql(alias?: string)` to `packages/api/src/lib/trade-sql.ts`, typed `sql<number | null>`, as the SQL twin of `postRowOf` (design D1).
  - The SQL is `coalesce((SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.lead_list_id = <alias>.id), (SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.want_list_id = <alias>.id))`, with `column(alias, "id")` for `<alias>.id`.
  - Doc comment: one line naming `postRowOf` as its twin, which changes with it.
  - Verify: in `trade-sql.test.ts`, `describe("postRowOf and postRowSql")` asserts `flat(postRowSql("l"))` equals the flattened text above with `l.id`. Using `flat` as the existing tests do.
- [x] 1.3 Test that no two shown posts share a row.
  - In `trade-post-rows.test.ts`, build the lists on Trade for the rows of 1.1:
    - have 1 (`linkedListId: 2`) and want 2 (`linkedListId: 1`);
    - want 3 (`linkedListId: null`);
    - want 5 (`linkedListId: 4`, with list 4 left out as off Trade).
  - Run them through `pairPosts` (`lib/trade-feed.ts`), and map each post to `postRowOf(rows, post.anchor.id)`.
  - Verify: the result is `[1000001, 1000002, 1000003]` in some order, with no null and no repeat.
- [x] 1.4 Add `postId: postRowSql("lists")` to `feedListColumns` and `postId: number | null` to `FeedList`, both in `packages/api/src/services/trade/feed/entries.ts`.
  - Fix every object literal typed `FeedList`, or built for `feedListColumns`, that typecheck then rejects: add `postId: null`, or the row in a fixture. Find them with `grep -rn "FeedList" packages/api/src`.
  - Verify: `bun run typecheck --filter=@repo/api` passes and `bun test packages/api` stays green.
- [x] 1.5 Emit `postId` on each feed post.
  - In `packages/api/src/services/trade/feed/posts.ts`, beside `id: post.anchor.id` (about line 181), add `postId: post.anchor.postId`.
  - In `packages/api/src/schemas/trade.ts`, `feedPostSchema` (about line 201) gains `postId: z.number().int().nullable().meta({ description: "The post's own id, which stays while the post does. \`id\` is its anchor list's id." })`.
  - `id`, `swapPair.theirPostId` and `sides[].list.id` stay as they are (design D3).
  - Verify: typecheck passes. `bun test packages/api` is green. `rg -n "postId" packages/api/src/schemas/trade.ts` shows the field inside `feedPostSchema`.
- [x] 1.6 Emit `postId` from `trade.myPosts`.
  - In `packages/api/src/services/trade/feed/mine.ts` `fetchMyPosts`, add `postId: post.anchor.postId` beside `id` and `slug`. The procedure has no `.output()`, so the type follows.
  - Verify: typecheck passes for `@repo/api` and `web`.
- [x] 1.7 Document the rule in `packages/api/docs/trade.md`, at the end of the Trade posts section, in the file's prose style:
  - a post's id is its row, read through `postRowSql` (`lib/trade-sql.ts`) and its twin `postRowOf` (`lib/trade-post-rows.ts`): the lowest row the anchor leads, else the lowest it is the want list of, since a want list on Trade can sit in a row led by an off-Trade have list;
  - feed posts and `trade.myPosts` carry it as `postId`, beside `id`, which stays the anchor list's id, as `swapPair.theirPostId` does;
  - no input takes a post id.
  - Verify: the paragraph names both functions and both fields, and `bun run check` passes.

## 2. Checks and docs across packages

- [x] 2.1 Check the API read path locally.
  - First check, without printing either value, that `.env.local` sets both `DATABASE_URL` and `REDIS_URL` to a local host (`localhost` or `127.0.0.1`). Stop if either is not local, because a feed read writes Redis: the rate-limit counters, the stored people order, and `getCache` entries such as `trade:counts:*`. As planned on 2026-11-16, both were local.
  - `curl -s localhost:3000/api/v1/spec.json`: the `/trade/people` 200 schema's post object lists `postId` with its description.
  - `curl -s 'localhost:3000/api/v1/trade/people'`: every post has an integer `postId`, and `swapPair.theirPostId` (signed-in only, so skip it signed out) still matches a `posts[].id`.
  - Verify: both outputs are recorded in As built. No write is sent.
- [x] 2.2 Run `bun run check`, `bun run build --filter=web` and `openspec validate post-ids-in-addresses --strict`, and record each result in As built.
  - Verify: all three pass.
- [x] 2.3 Decide whether any `AGENTS.md` changes, and record the outcome in the As built section of `design.md`.
  - Read the root, `packages/api`, `packages/db` and `apps/web` `AGENTS.md` for lines this change makes false. Weigh `packages/db/AGENTS.md` (Trade posts) in particular. It says a row keeps its id "even when its lead changes". A reader takes that to cover Edit post's swap and drop, which give a new row (design.md, What survives what).
  - If that line or any other is false, fix it with `writing-for-agents`. Otherwise state that none changed.
  - Verify: the As built note says which files were read and the outcome.

## Workflow follow-up

- Archive once groups 1 and 2 are done.
- The post page by id is a later change, opened after the planner change that keeps the row through Edit post's swap and drop. It starts from design.md, Deferred: post page by id.
