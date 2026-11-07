# Tasks

## 1. Pairing rule

- [x] 1.1 Add `packages/lib/src/spin-pairing.ts` with `pairSpins` and `spinOutcome` (design: Pairing lives in `@repo/lib`), exported as a subpath the web can import; verify `spin-pairing.test.ts` covers the `web-spin-results` scenarios (single, next spin before reward, chained, other artist, older than 10 minutes, pending vs broke at the clock) and `bun run test`, lint, typecheck and build pass for `@repo/lib`

## 2. API

- [x] 2.1 Add the optional `spin` (`outcome`, `reward`) and `rewardOf` fields to the activity and transfers item schemas, documented for OpenAPI; verify `/api/v1/spec.json` names both on `GET /activity` and `GET /transfers/{address}`, and lint, typecheck and build pass for `@repo/api`
- [x] 2.2 Add `services/spin-rewards.ts` (windowed `VALUES … LATERAL` reads of mints to and spins from each page address, the indexer-head clock, `pairSpins`) and call it from `fetchActivityPage` and `fetchAddressTransfers`; move any decision logic that is not a query into `@repo/lib` with tests; verify on a local dev server, reading prod indexer read-only, that `GET /api/v1/activity?type=spin` returns `spin.outcome` on every row and that a recent rewarded spin's `spin.reward.transfer.id` equals the mint row carrying its `rewardOf`, both through `/api/v1` and the legacy `/api` route
- [x] 2.3 Run `EXPLAIN (ANALYZE, BUFFERS)` of both reads for a 300-row All page and a 150-row profile page on prod with `default_transaction_read_only=on`; verify each probe uses `idx_transfer_mint_to_ts_id` / `idx_transfer_from_ts_id` and the page's added time stays under 50 ms, otherwise stop and report before the web work

## 3. Row design (prototype)

- [x] 3.1 With `mattpocock-skills:prototype`, build a throwaway scratch route with a switcher showing 3 variants of a spin row (reward, broke, pending) inside the real `ActivityTable` at desktop and phone widths, following the Look in `apps/web/AGENTS.md`; verify the user picks a variant, then delete the scratch route and save the patch under `.claude/worktrees/prototypes/`

## 4. Web: activity and profile

- [x] 4.1 Add a pure `foldSpinRows(rows, { type, facets })` beside `live-feed.ts` (design: The browser folds) with tests for the All, Mint, Spin and facets-exclude-the-spin cases; verify `bun run test` passes for `web`
- [x] 4.2 Build the chosen spin row in `activity-row.tsx` and in `trades-view.tsx`'s `TradeRow`, both drawing rows through `foldSpinRows`, reward objekt opening the drawer; add the broke and pending labels to Paraglide in en, ko (합니다체) and ja; verify in the running app with `browser-testing-with-devtools` that `/activity` All and Spin, and a profile's Activity history in both sort orders and at a checkpoint, show one row per pair and the three outcomes, then run `better-interface` on both rows and fix what it finds
- [x] 4.3 Extend `LiveFeed` with the rewards map and attach incoming mints to pending spins before `matchesFilters` (design: Live rewards attach before the filter runs), with pending spins turning broke against the newest row's time; verify `live-feed.test.ts` covers a reward for a live spin, for a first-page spin, under `type=spin`, a replayed batch not attaching twice, and broke after 10 minutes, and that on `/activity` a fresh spin row turns from pending to its reward without a new row appearing
- [x] 4.5 Add the Group spins toggle (`spins=raw`, `features/activity/spin-grouping.tsx`) to both toolbars, skipping the fold and the outcome cell when off; verify in the running app that it flips both pages between grouped and raw, survives a filter change and a reload, and that lint, typecheck and test pass for `web`
- [x] 4.4 Verify lint, typecheck, test and build pass for `web`, `@repo/api` and `@repo/lib` (`bun run check` and `bun run build`)

## 5. Docs

- [x] 5.1 Add to `packages/api/AGENTS.md` how spin rows get `spin` / `rewardOf` (one pairing rule in `@repo/lib`, indexer-head clock, rows never dropped server-side) and to `apps/web/AGENTS.md` that transfer lists draw through `foldSpinRows` and live rewards attach before filtering; verify both files read correctly with the `writing-for-agents` skill

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
