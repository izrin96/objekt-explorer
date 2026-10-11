## 1. Data

- [ ] 1.1 Add the `active_hours` table to `packages/db/src/schema.ts` (design decision 1) with its check constraint, and generate the migration with `bun run --filter=@repo/db db:generate`. Do not apply it; ask the user before applying it locally. Verify the generated SQL only creates the table and its constraint, and typecheck passes for `@repo/db`.

## 2. Server logic

- [ ] 2.1 Add `packages/api/src/lib/active-hours.ts` (design decision 2): schemas, `periodsBetween`, `isActiveAt`. Add `active-hours.test.ts` covering Kuala Lumpur, London across 25 Oct 2026, a past-midnight range at a weekday/weekend boundary, overlap rejection, an unknown timezone, and a 7-day span. Verify `bun test packages/api/src/lib/active-hours.test.ts` passes.
- [ ] 2.2 Add `services/active-hours.ts` with the owner's read and upsert, and `activePeriodsOf(userIds, now)` (design decision 3). Add `user.activeHours` and `user.setActiveHours` (design decision 5). Verify lint and typecheck pass for `@repo/api`.
- [ ] 2.3 Attach `activePeriods` to Browse posts (`services/trade-feed/index.ts`), For you partners (`services/trade-matches/index.ts`, beside `reputationOf`, past the cache) and the chat thread partner (`services/chat/inbox.ts`). Verify the outputs carry `activePeriods` and no `time_zone`, and lint and typecheck pass for `@repo/api`.
- [ ] 2.4 Add `active` to the browse input and the owner-id filter (design decision 4): load enabled rows, keep the active ids with `isActiveAt`, pass `owners` to `fetchFeedRows`, return empty at once when none. Verify lint and typecheck pass for `@repo/api`.

## 3. Account section

- [ ] 3.1 Add the `/account/trade` route, its nav entry after Messages (and in the phone list), and `features/account/sections/trade.tsx` (design decision 7), with en/ja/ko messages. Verify read-only: the section loads the detected timezone, the controls build the `setActiveHours` request a change would send, and a refused value shows its reason. Do not save anything to the production database. Verify lint, typecheck and build pass for `web`.

## 4. Active mark

- [ ] 4.1 Add `features/active-hours/active-mark-text.ts` (`markFor`, `dayBar`) with `active-mark-text.test.ts` (inside a period, minutes/hours/days until the next one, no periods, a period crossing the viewer's midnight on the bar). Verify `bun test` for it passes.
- [ ] 4.2 Add `active-mark.tsx` (design decision 6) and place it in `browse-post.tsx` and `partner-row.tsx` bylines and in `thread-header.tsx` under the reputation line. Add en/ja/ko messages. Verify lint, typecheck and build pass for `web`.

## 5. Browse switch

- [ ] 5.1 Add `active` to `browse-search.ts` and `toBrowseInput` with a test, the Active now switch beside Only matches, and the "nobody is active right now" empty state with a control that turns it off. Verify `bun test apps/web/src/features/trade/browse-search.test.ts` passes, and lint, typecheck and build pass for `web`.

## 6. Verify

- [ ] 6.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [ ] 6.2 With the migration applied locally (after the user approves) and a local database, browser check: set Active hours on a local test account, then as another local account confirm "Active now" / "Active in …" and the popover on Browse, For you and the chat header, at 1280 px and 390 px; Active now on Browse keeps only active owners; the network response carries periods and no timezone name. Record what was checked and on which database.
