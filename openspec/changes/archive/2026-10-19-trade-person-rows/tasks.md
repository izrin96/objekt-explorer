# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches.

## 1. Clear the ground

- [x] 1.1 Revert the uncommitted per-post Browse chip work in `browse-post.tsx`, `match-chip.tsx`, `matched-lists.tsx` and `packages/api/src/schemas/trade.ts`. Leave `person-sheet.tsx` as it is; 4.6 deletes it. Revert the `export` added to `PostStrip` in `post-side.tsx` only if 4.2 does not need it.
- [x] 1.2 Delete the prototype: `apps/web/src/features/trade/person-feed-mock.tsx` and `apps/web/src/routes/(container)/trade/mock.tsx`. Let the dev server regenerate `routeTree.gen.ts`.

## 2. Idle lists stop counting (packages/api)

- [x] 2.1 In `services/trade-matches/candidates.ts`, restrict `partner_lists` to lists inside a listed post: `postsCte` + `listedPost`, over `posts.id` and `posts.partner_id`. Leave the viewer's own lists unfiltered.
- [x] 2.2 Check every reader of the candidates for idle lists that are still counted: `recountPartners`, `personMatches`, `getMutualPeople`, `getOneWayPeople`, Mutual N, and `personDetail` for chat matches. Bump the cache keys `trade:foryou`, `trade:mutual-people`, `trade:mutual-count`, `trade:person` and `trade:oneway-people`.

## 3. Person-paged feed (packages/api)

- [x] 3.1 Add the person cursor and `trade.people` input (`browseInputSchema` + optional `person`, cursor `{ bumpedAt, userId, phase?, rank?, oneWay?, scope?, lead? }`) and output schemas in `schemas/trade.ts`. Each person carries identity, user, reputation, `messageable`, `counts`, `section` and `posts` (the existing post shape).
- [x] 3.2 In `services/trade-feed/query.ts`, add a stage-1 people query for the bump order: grouped by `user_id` over `postsCte` + `feedWhere`, keyset `(max(bumped_at), user_id)`. Add an owner-existence read that returns the ranked people with a kept post.
- [x] 3.3 In `lib/trade-feed.ts`, make `fillPage` count people (`PEOPLE_PAGE_SIZE = 12`). Cap posts per person at 20. Replace `excludeWttOf` with excluding every Mutual person from `oneWay` and `tail`. Cover both in `lib/trade-feed.test.ts`.
- [x] 3.4 Add `peopleFeed` in `services/trade-feed/index.ts`. It reads each phase's next people, loads all their kept posts in one `fetchFeedRows` (`owners`, no cursor) + `loadPosts`, and assembles persons. It handles `person`: lead row first, then `excludeOwners` and `lead` in the cursor.
- [x] 3.5 Mount `trade.people` in `routers/trade.ts` (optionalAuthed). Leave `trade.browse` and `trade.person` untouched.
- [x] 3.6 Read-only check against staging with a signed-in viewer:
  - nuppotoz's row holds both WISHLIST and S24 WISHLIST on one page;
  - a 13th person starts page 2;
  - `person=<id>` leads and is not repeated;
  - an idle-only person is gone from For you.

## 4. Person row (apps/web)

- [x] 4.1 Add pure `features/trade/person-row.ts` with `orderPosts`, `leadPost`, `headerSentence` and `listCount`, plus `person-row.test.ts`. Cover:
  - the nuppotoz case;
  - a pair with counts on both sides;
  - no match;
  - the M>0 / B / A precedence.
- [x] 4.2 Give `SideStrip` an optional list-count chip in its label, and make its un-narrowed label role + " · " + name. Keep the narrowed "HAVE 4" / "of N" wording from Filters.
- [x] 4.3 Add `features/trade/person-row-view.tsx`, from `TradeHeader`, `TradeActions`, `TradeSides`, `TagBadge` and the notes:
  - the header sentence (mutual number indigo), "N lists · bumped/updated <time>", and the ⋯ menu with Hide;
  - posts in `orderPosts` order, the first 2 shown then "+N more lists" (all shown when it is the `person` lead row);
  - Message and Make offer for `leadPost`, with `withMatch` from the person's counts.

  Match the layout to the spec at `@3xl` and when stacked.
- [x] 4.4 Add `peopleOptions` to `queries.ts`. Rewrite `BrowseView` to page `trade.people` and virtualise person rows and section headings, keep the empty states, and drop `PersonSheet`/`openPerson`. Add the lead row's clear control, which removes `person` with `replace`. Update `browse-loader.ts`' first-paint load and the skeleton.
- [x] 4.5 Copy in `apps/web/messages/{en,ko,ja}.json`:
  - the header sentences;
  - "N lists";
  - "+N more lists";
  - the list count chips ("N you want", "N you have");
  - the lead row's clear control;
  - For you's description "People who match your lists, best match first."

  Remove the now-unused chip and sheet messages.
- [x] 4.6 Delete `person-sheet.tsx`, `match-chip.tsx`, `matched-lists.tsx`, `person-groups.ts` and `person-groups.test.ts`, then run `bun run knip` for leftovers (e.g. the `trade.person` query options, which only the sheet used).

## 5. Verify

- [x] 5.1 `bun run check` and `bun run build` pass at the root.
- [x] 5.2 Browser check on the dev server, read only (`browser-testing-with-devtools`):
  - Browse and For you at 1280 px and 390 px;
  - nuppotoz's row;
  - "+N more lists";
  - a `person` link from a chat post card;
  - Hide with Undo;
  - Message opens with the lead post card (stop at the request boundary);
  - no horizontal overflow reported.
- [x] 5.3 Update `apps/web/AGENTS.md` (the Chat draft note that only Browse's Message attaches a post card now names the person row) and `packages/api/AGENTS.md` (Trade matching: `trade.people` pages by person, `excludeWttOf` is gone, the idle filter is in candidates, and the new cache key versions). The root `AGENTS.md` is unchanged.

## Workflow follow-up

- Native ko/ja review of the new copy before release.
- A later change removes `trade.browse`, `trade.person` and `tradeTheyHave`/`tradeYouHave` once no pre-deploy tab can be open.
- `/opsx:archive` after apply.
