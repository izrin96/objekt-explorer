## 1. Schema and migration

- [x] 1.1 In `packages/db/src/schema.ts`, add to `lists`:
  - `showOnTrade` (`show_on_trade`, boolean, not null, default false);
  - `bumpedAt` (`bumped_at`, timestamptz string mode, nullable);
  - the CHECK constraint `lists_trade_needs_discoverable` (`NOT show_on_trade OR discoverable`);
  - the partial index `lists_trade_feed_idx` on `(bumped_at DESC, id)` where `show_on_trade` (design D1, D2, D3).

  Lint and typecheck pass for `@repo/db`.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate`, and read the SQL to confirm it adds only the two columns, the constraint and the index. Apply it to the local Docker database with `bun run --filter=@repo/db db:migrate`, after checking that `.env.local` resolves `DATABASE_URL` to localhost. `\d lists` shows all four. Never apply it to production.

## 2. Show on Trade writes

- [x] 2.1 Add optional `showOnTrade` to `createListInputSchema` and `editListInputSchema`, and `showOnTrade` and `bumpedAt` to the public list output. In `routers/list-crud.ts`:
  - store `showOnTrade && discoverable` at every write that sets `discoverable`: create, update, and the two linked-partner syncs;
  - turning it on also turns discoverable on, through `resolveDiscoverable`;
  - an off-to-on change sets `bumpedAt = now()`;
  - an omitted field keeps the stored value on update, and is false on create (design D2).

  Verify against the local DB with a script, never with production:
  - an edit without the field leaves it unchanged;
  - turning discoverable off clears it;
  - an unbound have list cannot turn it on.

  Lint and typecheck pass for `@repo/api`.
- [x] 2.2 Add `trade.setShowOnTrade({ slug, on })` (authed, owner only, have, want or sale lists only). It applies the same rules as 2.1, calls `touchListWith` after commit, and returns the saved `{ showOnTrade, discoverable, bumpedAt }`. A foreign slug gets NOT_FOUND, and an unbound have list gets BAD_REQUEST with a reason code the dialog can show. Lint and typecheck pass for `@repo/api`.

## 3. Feed module, service and API

- [x] 3.1 Add `packages/api/src/lib/trade-feed.ts`, a pure module with no database imports (design D6), holding:
  - pairing rows into posts, with the have list as anchor;
  - tags (WTT, WTB, WTS);
  - the 30-day idle test;
  - `nextBumpAt`;
  - preview selection: ringed first, then newest, at most 8 per side, plus the remaining count;
  - viewer counts.

  Add `trade-feed.test.ts` covering the spec scenarios:
  - linked pair is one post;
  - half a pair;
  - nothing left;
  - edit does not jump the queue (order uses the bump time only);
  - idle post drops out;
  - too soon to bump.

  `bun test` passes, and lint and typecheck pass for `@repo/api`.
- [x] 3.2 Add `services/trade-feed.ts` with the stage 1 query (design D3). The filters (`collectionFiltersSchema`, `type`, `have`, `slug`) go in `schemas/trade.ts`, with the collection filters resolved to slugs in the indexer the way `services/activity-feed.ts` builds its predicates. The query:
  - collapses pairs;
  - drops idle posts, the viewer's own posts and hidden partners;
  - uses a keyset cursor and over-fetches 36.

  On the local copy, with a few lists switched on by script, `EXPLAIN ANALYZE` uses `lists_trade_feed_idx` and runs under 100 ms. Lint and typecheck pass for `@repo/api`.
- [x] 3.3 Add stage 2 (design D3, D4):
  - per-list ownership-checked entries, cached under `trade:post:<listId>:<updated_at>` (60 s) and filled in one batch with `fetchHoldings` (export it from `trade-matches.ts`, don't copy it);
  - the viewer's have slugs: have-list entries still tradeable, judged with `collectionVerdict`, cached under `trade:have:<userId>:<version>` (5 min) — never the whole wallet;
  - the viewer's wanted slugs;
  - assembly through `trade-feed.ts`, with identity from `toPartnerIdentity`.

  Against the read-only production indexer, a sold entry on a local test list is hidden. Record the worst-case page time with the three largest have lists on Trade (risk in design). Lint and typecheck pass for `@repo/api`.
- [x] 3.4 Add the following to `routers/trade.ts` and register them in `routers/index.ts`, not in `openApiRouter`:
  - `browse` (public, viewer-aware when a session exists);
  - `bump({ slug })` as the single conditional UPDATE from design D5, throwing TOO_MANY_REQUESTS with `nextBumpAt`;
  - `myPosts()` (authed: the viewer's lists on Trade, paired, each with listed or idle, `bumpedAt` and `nextBumpAt`);
  - `collectionPostCounts({ slug })` (public, 60 s cache, counts have-or-sale and want posts with ownership checked).

  Over `/rpc` on local:
  - a second bump within 24 h is refused;
  - two concurrent bumps let exactly one through;
  - `browse` signed out has no viewer fields.

  Lint and typecheck pass for `@repo/api`.

## 4. Web: Trade layout and Browse

- [x] 4.1 Add `routes/(container)/trade/route.tsx`, a layout with a Browse / For you tab bar and an `Outlet`. Make `trade/index.tsx` the Browse route:
  - `validateSearch` covers the collection filters, `type`, `have` and `slug`, with `.catch` on each so bad values are ignored;
  - the loader prefetches the first page with `staleTime: "static"`;
  - `head` uses a new `page_titles_trade` message.

  `/trade` no longer redirects, and the For you tab is active on `/trade/for-you`. Signed out, the For you tab lands on `/login?redirect=%2Ftrade%2Ffor-you`. Lint, typecheck and build pass for `web`.
- [x] 4.2 Add `features/trade/browse-view.tsx` and `browse-post.tsx`:
  - the shared filter bar (as in `market-view.tsx`), plus Type as segmented `Tabs` (the same control as For you's filter, scrolling on a phone) and the "They want something I have" toggle, shown only when the viewer has a have list with a tradeable entry, its state taken from the effective value `browse` returns;
  - a chip for `slug`;
  - posts with identity, tag, list links, up to 8 `ObjektCard`s per side with "+N" and ringed matches;
  - WTS prices in the list currency, or QYOP;
  - the bumped or updated time;
  - infinite scroll, and empty, error and retry states.

  Every string goes in `m.*` in en, ja and ko. In the browser at 1280 px and 390 px:
  - filters update the URL and the posts;
  - the page has no horizontal scroll;
  - signed out, there are no rings and no toggle.

  Lint, typecheck and build pass for `web`.
- [x] 4.3 Add `features/trade/my-posts.tsx`, the Your posts strip with listed or idle state, the bump time and a Bump button that shows the time left. Add `post-list-dialog.tsx`: Post a list, with a Show on Trade `Switch` per have, want and sale list. Each switch saves at once through `setShowOnTrade`. It is disabled with the reason for an unbound have or sale list. Signed out, Post a list goes to `/login?redirect=%2Ftrade`. On local, with the smoke account:
  - switching a want list on adds it to Your posts;
  - Bump then shows the 24 h wait;
  - another account's view of `/trade` lists the post first.

  Lint, typecheck and build pass for `web`.

## 5. Web: around Trade

- [x] 5.1 Add Trade after Market in `components/layout/app-nav.tsx` and `mobile-nav.tsx`, active for `/trade` and every path below it. In the browser:
  - at 1280 px, Trade is active on `/trade/for-you`;
  - at 390 px, the sheet closes when Trade is tapped.

  Lint, typecheck and build pass for `web`.
- [x] 5.2 Add the Show on Trade switch to the list form (`list-form` and `edit-list-dialog`) for have, want and sale lists. It turns discoverable on with it, and is disabled with the reason where discoverable can't be on. Add the On Trade badge, linking to `/trade`, in `list-header` for every visitor. In the browser, editing a list round-trips the switch, and a signed-out visitor sees the badge. Lint, typecheck and build pass for `web`.
- [x] 5.3 Add the On Trade line to `features/objekt/drawer/market.tsx`. It uses `collectionPostCounts`, is hidden when both counts are zero, and links to `/trade?slug=<slug>`. In the browser, the link opens Browse filtered with the chip shown. Lint, typecheck and build pass for `web`.

## 6. Whole-change checks

- [x] 6.1 Run `bun run check` (lint, typecheck, tests) and `bun run build --filter=web`, and both pass. The format check is clean. `bun run knip` reports no new unused exports.
- [x] 6.2 In the browser against local, walk every `web-trade-browse` scenario plus the delta scenarios in `web-lists`, `web-shell`, `web-trade-for-you` and `web-objekt-browser`. Record each as passed or read-only verified. Restore any test lists switched on by script, and confirm production was never written.
