# Tasks

Each task is done once lint, typecheck and build pass for the package it touches: `bun run lint`, `bun run typecheck` and `bun run build --filter=web` for `apps/web`, and `bun run lint` and `bun run typecheck` for `packages/api`.

## 1. For you order: pure logic (`packages/api`)

- [x] 1.1 In `lib/trade-rank.ts`, add `OneWayRank`, `oneWayRankOf`, `oneWayPeople` (sum above 0, ordered by sum, then last change, then id) and `oneWayPeopleAfter` (the `peopleAfter` keyset rule).
  - Tests in `trade-rank.test.ts`: the order, ties, a person who moved up between loads, and the cursor's own person resuming.
- [x] 1.2 In `lib/trade-feed.ts`, add the phase plan: given mode, `type` and the cursor, which phases a page reads and in what order.
  - Mutual is skipped for WTB/WTS. An old cursor with no `phase` maps to tail (no `rank`) or to mutual (`rank`).
  - Tests: every mapping, plus a page whose phase runs dry hands off to the next one.
- [x] 1.3 In `schemas/trade.ts`, extend `feedCursorSchema` with optional `phase` (`mutual | ranked | tail`) and optional `oneWay` (`OneWayRank`).
  - Tests in `trade.test.ts`: an old `{ bumpedAt, id }` cursor and an old Mutual cursor still parse to the same data.

## 2. For you order: service (`packages/api`)

- [x] 2.1 Add `getOneWayPeople(userId, sides)` in `services/trade-matches/` over `recountPartners(userId, sides, "all")` and `oneWayPeople`, cached at `trade:oneway-people:1:` with the scope and 300 s TTL of `getMutualPeople`.
  - Verify: typecheck, and a read-only call against the local database returns ranked people.
- [x] 2.2 Extend `fetchFeedRows` (`services/trade-feed/query.ts`) with two options:
  - exclude the WTT posts of a given owner set (for the ranked phase);
  - exclude a given owner set (for the tail).
  - Verify: the tail query's `EXPLAIN` on the local database still uses the bump-order index.
- [x] 2.3 In `browseFeed`, under Any, run the phases from 1.2: fill the page across them, set `nextCursor` with its `phase`, and add `section` to each post.
  - Browse and Mutual only are unchanged.
  - Verify: on local For you, scroll Any to the end. Mutual posts come first, then One way by sum, then the bump-ordered rest, and no post repeats.

## 3. Strips and rows (`apps/web`)

- [x] 3.1 Give `post-side.tsx` the tab context. The label reads role plus count, adding "you want"/"you have" on For you. "of N" links to the list after the strip, replacing "+N others". An empty side becomes one muted line under the other strip, which takes the full width, with no ⇄ mark.
  - Verify: on local Browse filtered to one member, and on For you, against the Filters scenarios.
- [x] 3.2 In `browse-post.tsx`:
  - on For you, show the match chip only when the mutual score is above 0;
  - render `ListsPopover` ("2 lists") only for two lists, and with one list make the strip label link to the list, with the name in its accessible name;
  - style the chip and All matches as small outline buttons.
  - Verify: the Trade card scenarios One list, Two lists, One-way post on For you and Mutual post on For you.
- [x] 3.3 In `trade-header.tsx`:
  - add a `socials` prop: posts show Discord only, and the person sheet shows both;
  - keep the reputation line on one line, truncated, with its full text available to assistive technology;
  - add the muted "You" tag on the viewer's own Browse posts.
  - Verify: scenarios Twitter in the sheet and Own post on Browse.
- [x] 3.4 Change the below-`md` row in `trade-row.tsx`/`browse-post.tsx`: a header with name over one mono line (tag · reputation · time) and ⋯ at the end, then the strips, then the list line, then the actions row with Make offer filling the width.
  - Verify: at 390 px Browse and For you match the Phone width scenario, with no sideways page scroll.

## 4. Controls, filters, sections, copy (`apps/web`)

- [x] 4.1 Add an opt-in to the shared filter components (`facet-controls.tsx`, `filter-sheet.tsx`) that folds every facet into the sheet below `md`, with the badge counting all active facets. Leave the default unchanged, and use the opt-in from `BrowseFilters`.
  - Verify: Trade at 390 px matches Filters on a phone, and Objekts and Market at 390 px look as before.
- [x] 4.2 Move the Post type menu to the end of the facet row on both tabs. On For you, put Mutual only, Compare with and the help after a divider on the same row from `md` up. Below `md`, put Filters, Mutual only, Post type, Compare with and the help in one row that scrolls sideways on its own.
  - Verify: the Matches and Compare with scenario Phone, and at 1280 px one wrapping row.
- [x] 4.3 In `browse-view.tsx`, under Any, insert a Mutual or One way heading (no count) before each run of posts with the same `section`. Show none under Mutual only.
  - Verify: the scenarios Two sections under Any, Nobody mutual under Any and Headings under Mutual only.
- [x] 4.4 Copy:
  - For you's description reads "Posts that match your lists, best match first."; hide either tab's description below `md`;
  - Your posts reads "all ready to bump" when ready equals the total, via a helper in `my-posts-summary.ts` with tests (`summarizePosts` counts unchanged);
  - add or rename the en, ja and ko messages (strip labels, "of {total}", the none lines, section headings, "You", "{count} lists", "all ready to bump") and remove the unused `trade_strip_others` and `trade_strip_of` if nothing reads them.
  - Verify: `bun run test` passes, and the Every post ready and None ready scenarios hold.

## 5. Check and document

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`. Walk Browse and For you at 1280 px and 390 px against every scenario in this change's deltas, read-only, and record what passed.
- [x] 5.2 Update `packages/api/AGENTS.md` Trade matching:
  - the Any phases and their cursor (`phase`, `oneWay`);
  - `getOneWayPeople` and its cache key `trade:oneway-people:1`;
  - the old-cursor mapping.
  - Also state that `apps/web/AGENTS.md` needs no change, or add the filter opt-in to it if its filter conventions mention quick facets.
  - `apps/web/AGENTS.md` needs no change: its conventions don't mention quick facets, and the `foldAll` opt-in is documented where it is declared.

## Workflow follow-up

- Ask a native speaker to check the ja/ko wording.
- Archive with `/opsx:archive` after the user verifies.
