# Tasks

## 1. Per-post swap score (packages/api)

- [x] 1.1 Carry each partner list's link: select `linked_list_id` in `partner_lists` (`services/trade-matches/candidates.ts`) and give each `Candidate` a `postOf` map (list id → offering-list id) for its matched lists, a pair counting only when its halves are of opposite sides and the offering half can swap; verify `bun run --filter=@repo/api typecheck` passes and candidates for a known partner (read-only, local DB or a test fixture) carry the map
- [x] 1.2 Add `swapMyListIds` and `swapPartnerListIds` to `Match` in `recount` (`lib/trade-rank.ts`): the lists through which `trade` holds, in both directions; extend `lib/trade-rank.test.ts` with a Sell or swap entry and a mixed have/sale case, and verify `bun test packages/api/src/lib/trade-rank.test.ts` passes
- [x] 1.3 Write `swapScore` in `lib/trade-person.ts` (best `min` over `(myPost, theirPost)` pairings, plus that pairing's they-have count) and add `swap` and `swapTheyHave` to `MatchCounts` through `matchCounts`; make `mutualOf` return `counts.swap`; add tests for the four mockup people (Jun, Rae, Mina, Sora), a partner with two posts split across directions, and unlinked lists on each side, and verify `bun test packages/api/src/lib/trade-person.test.ts` passes
- [x] 1.4 Build the viewer's `postOf` from `resolveTradeSides`' lists through `pickedSides` and pass both maps wherever `matchCounts` is called (`recount.ts`, `person.ts`, `mutual.ts`, `one-way.ts`, `trade-feed`), so `countsFit`, `rankPartners`, `mutualPeople`, `mutualCount`, `buildPeopleOrder` and `mutualPartnerIds` read the per-post score; verify `bun run --filter=@repo/api typecheck` and `bun test` pass
- [x] 1.5 Bump the ranking cache versions: `trade:mutual-people:9`, `trade:mutual-count:9`, `trade:person:8`, `trade:oneway-people:5`, `trade:people-order:3`; verify `rg "trade:(mutual-people|mutual-count|person|oneway-people|people-order):" packages/api/src` shows only the new versions, and lint + typecheck + build pass for `@repo/api`

## 2. Alerts (apps/worker)

- [x] 2.1 Add `swapPair` and, for want lists, `takesSwaps` to `AlertList` where `job/want-alerts/context.ts` loads lists, and in `judge` (`lib/want-alert-match.ts`) let a recipient list on Can swap with no pair alert on a swap match without the two-way question, skip a non-swap match (Sell only offer, or a want list not taking swaps), and record `match: "any"`; add `want-alert-match.test.ts` cases for an unlinked want list on Can swap alerting on a one-way have listing, skipping a Sell only listing, an unlinked have list alerting in reverse, an unlinked Sell only list skipping a buyer, and a linked list still asking `mutualQuestions`; verify `bun test apps/worker/src/lib/want-alert-match.test.ts` passes
- [x] 2.2 Confirm `mutualPartnerIds` returns only per-post partners for a linked list by a test or a read-only run against the local database; verify lint + typecheck pass for `worker`

## 3. Rows, chip and help (apps/web)

- [x] 3.1 Load `vercel-react-best-practices`, then change `matchBand` (`features/trade/person-row.ts`) so a person with both counts and both pooled swap counts above zero but `swap` 0 is `oneWay` (no chip) and `noSwap` stays for sale-only matches; make `swapThroughRules` read `swapTheyHave`; extend `person-row.test.ts` for both bands and the rules note, and verify `bun test apps/web/src/features/trade/person-row.test.ts` passes
- [x] 3.2 Update `match-help.tsx`: edit the two Can swap yes rows to name the linked want list, add a no row for lists on different posts or with no link, add a Post row to Good to know and change its Lists row; add or edit `trade_help_*` strings in `en`, `ko` and `ja`; verify the popover in the running app (light, dark, a phone width) matches the mockup's ? popover screen
  - Checked 2026-10-28 on the dev server against production, signed in as SMOKE_TEST1: rows and copy match the mockup in dark, light and at 390px, with no horizontal overflow.
- [x] 3.3 Edit `notification_alert_mutual_desc` in `en`, `ko` and `ja` to read "Only people you can swap with, inside one of your posts. Sale listings are left out. A list with no link alerts on swap listings."; verify `/account/notifications` shows it
  - Read-only verified: the account is on Any, so selecting Can swap would save. The save was blocked in the browser (no request reached the server); the compiled `notification_alert_mutual_desc` reads as specified in en, ko and ja, and `CHOICE_DESCRIPTION.mutual` shows it.
- [x] 3.4 Verify in the running app, read-only against production data: on For you a cross-post person sits under One way with no chip, a same-post person keeps "You can swap N", the Can swap button's count matches the Can swap section, and Browse shows the same chips; record what was checked; lint + typecheck + build pass for `web`
  - Checked 2026-10-28. Against production, read-only: `trade.people` carries `swap` and `swapTheyHave`; for viewers with several posts the services put cross-post people under One way, and `mutualPartnerIds` per linked list equals the per-post set. In the UI on the local database (indexer production, read-only), with a viewer of two posts and two people on real wallets: For you lists the same-post person under Can swap with "You can swap 1" and the cross-post person under One way with no chip; the Can swap button reads 1, as the section does; with Can swap on only the same-post person shows; Browse shows the same chips and no "No swap". Lint, typecheck and the web build pass.

## 4. Documentation

- [x] 4.1 Update `packages/api/AGENTS.md` (Trade matching: `mutualOf` reads the per-post `swap`, `swapScore`, post keys from `pickedSides` and `linked_list_id`, the pooled SQL prefilter, new cache versions) and `apps/worker/AGENTS.md` (Want alerts: Can swap on an unlinked list acts as Any); state that `apps/web/AGENTS.md` needs no change, or update it if 3.x altered a convention; verify `bun run check` passes

## Workflow follow-up

- Review the change, then `/opsx:archive` it once deployed; other open changes (chat-reply, market-listed-window, messages-deal-view, receiver-confirmed-legs, trade-active-hours, banner-upload-compression) are independent of it.
