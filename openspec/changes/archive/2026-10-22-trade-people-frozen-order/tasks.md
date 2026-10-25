# Tasks

## 1. Pure order helpers

- [x] 1.1 Add `buildPeopleOrder` (sections in order, later repeats dropped, lead left out, capped at `ORDER_LIMIT`, reports whether the tail was capped) and `nextSlice` to `packages/api/src/lib/trade-feed.ts`, and tests in `trade-feed.test.ts` for: section order, a person in two sections kept in the first, the lead left out, the cap, and slicing past the end. Verify with `bun test src/lib/trade-feed.test.ts`, then run lint, typecheck and build for `@repo/api`.
- [x] 1.2 Add `resumeAt(order, cursor)` (after the cursor's person, else `min(at, length)`, else the first entry of the cursor's `phase` section, else 0) with tests covering each branch, including an older tab's cursor with only `rank` or only `phase`. Verify with `bun test` and lint/typecheck/build.

## 2. Cursor and store

- [x] 2.1 Add optional `order` (1–64 chars) and `at` (non-negative int) to `peopleCursorSchema` in `schemas/trade.ts`, plus a test in `schemas/trade.test.ts` that a cursor without them, as an open tab sends, still parses to the same data. Verify with `bun test` and lint/typecheck/build.
- [x] 2.2 Add `loadPeopleOrder` / `savePeopleOrder` to `services/trade-feed/scope.ts`: key `trade:people-order:1:<viewerId|anon>:<token>`, 3600 s, `redisFailOpen`, a random token, and the stored filters fingerprint (a pure `ordersFingerprint` in `lib/trade-feed.ts`, tested for key-order independence). A mismatch or a parse failure reads as none. Verify with tests on the fingerprint, then lint/typecheck/build.

## 3. peopleFeed on the stored order

- [x] 3.1 In `services/trade-feed/index.ts`, build the order on page 1 (and on fallback) per design decision 3. Reuse `getMutualPeople`, `getOneWayPeople`, `fetchFeedOwners` and `fetchBumpPeople` with a limit, and save it. Verify by typecheck and by the live check in 4.1.
- [x] 3.2 Page through the order with `readBatches` and `loadPeople`. `at` advances past every examined person, sections come from the entries, and `nextCursor` carries `order`, `at` and the last examined person's `bumpedAt`/`userId`/`phase`/rank fields plus `lead`. Past a capped order, continue by keyset from `more`. Verify by typecheck and 4.1.
- [x] 3.3 Delete the ranked and tail branches of `readPeoplePhase`, `peopleScope`, and `resumeRanking`/`inSeenOrder` with their tests, and the `keepsScope` call in `peopleFeed`. Confirm with grep that `browseFeed` still uses only `mergeSeen`, `phaseScope`, `loadScope`/`saveScope` and `fillPage`. Run `bun run knip` and fix any newly unused export; then `bun run check`.

## 4. Verification

- [x] 4.1 Live read-only check: a scratchpad script calls `peopleFeed` for a viewer with Trade lists, in off, Any (All, WTT, WTB) and Mutual only, and follows `nextCursor` to the end. Assert user ids are unique across pages, sections never go backwards, the last page has no cursor, and record per-page time. Run it once more with the stored order deleted mid-scroll to exercise the fallback. Ask the user which env first (it writes Redis keys).
- [x] 4.2 Browser check of `/trade` and `/trade/for-you` with the `browser-testing-with-devtools` skill: scroll to the end in each option, confirm the section headings and the end marker, and confirm there are no console errors.
- [x] 4.3 Update `packages/api/AGENTS.md` (Trade matching): `trade.people` pages a stored order by position, page 1 builds it, the fallback rules, and the new key version. Drop the sentences about `peopleScope` and `resumeRanking` on that path. Verify with lint/typecheck/build for `@repo/api`.

## Workflow follow-up

- Archive the change after review (`/opsx:archive`).
