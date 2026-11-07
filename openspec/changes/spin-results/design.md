# Design

## Context

- The indexer stores every transfer as its own row (`transfer`: from, to, timestamp, token, collection); nothing links a spin to its reward. A spin is one token per transaction to `Addresses.SPIN`; the reward is a separate one-token mint from `Addresses.NULL` to the spinner.
- Prod sample (read-only, one day, 9,363 spins): 94% got a mint within 10 minutes, almost all within 30 seconds; 371 spins were followed by the spinner's next spin before the reward landed; 22 nearest mints were of another artist (purchases).
- `/activity` pages come from `services/activity-feed.ts` (300 rows, newest first, cursor on `(timestamp, id)`); the profile tab from `services/transfers.ts` (150 rows, `desc` or `asc`, `at` checkpoint). Both serve `/rpc`, `/api/v1` and the legacy `/api` routes from one service.
- Live rows on `/activity` come from the worker's `activity-relay` job through `enrichTransfers` and Centrifugo; the browser filters them with `matchesFilters` and keeps them in a `LiveFeed` above the paged rows (`features/activity/live-feed.ts`, a pure tested module).
- Indexes that serve the lookups already exist: `idx_transfer_mint_to_ts_id` (`to, timestamp` where `from` is null address) and `idx_transfer_from_ts_id` (`from, timestamp`).

## Goals / Non-Goals

**Goals:**
- One pairing rule, written once, used by the server for pages and by the browser for live rows.
- Pages stay the same rows in the same order; folding is a view decision in the browser.

**Non-Goals:**
- No worker or indexer change; the live relay sends rows as it does today.
- No persisted pairing table. If the lookup proves slow, a table filled by the worker is the follow-up, not part of this change.

## Decisions

### Pairing lives in `@repo/lib` as a pure function
`packages/lib/src/spin-pairing.ts` exports `pairSpins(spins, mints)`, taking plain `{ id, address, timestamp, artist }` records and returning `spinId → mintId`. Per address it walks spins and mints in time order: each mint goes to the oldest unclaimed spin at or before it, of the same artist, within 10 minutes. `spinOutcome(spin, rewardId, clock)` returns `reward`, `broke` or `pending`. Tested with `bun test` from the prod scenarios (single, in flight, chained, other artist, too late).
*Alternative:* in `packages/api` only. Rejected: the browser needs the same rule for live rows, and `@repo/lib` is already imported by both.

### The server annotates each page with two windowed reads
After a page is fetched, `services/spin-rewards.ts` (shared by both services) takes the page's spin rows and mint rows, and per row the window `[row − 20 min, row + 10 min]` on its spinner, merged where windows touch (one span per address would read a filtered page's months of history). It reads, for all addresses at once, the mints to and the spins from each address in its window (a `VALUES (address, lo, hi)` list joined `LATERAL`, so each probe uses the indexes above), joined to `collection` for the artist. It runs `pairSpins` over those and adds `spin` to spin rows and `rewardOf` to reward rows (fields in the `api-openapi` delta). The second window back lets an earlier spin claim its mint first, so two pages pair a chain the same way.
*Alternative:* hide reward mints in SQL with an anti-join. Rejected: it changes which rows a page holds, breaks the public contract and the cursor, and the Mint filter must keep them anyway.

### The clock is the indexer's head, not the wall clock
`pending` versus `broke` compares the spin with the newest indexed transfer's timestamp (one `idx_transfer_ts_id` probe per page). A lagging indexer would otherwise turn every recent spin broke.

### The browser folds, the server does not drop
A pure `foldSpinRows(rows, { type, facets })` in `features/activity` (also used by the profile tab) returns the rows to draw. In `all`, it drops a mint row that a drawn spin row shows as its reward, and drops one carrying `rewardOf` ahead of time only while its spin is not loaded and no facets are set; a reward its listed spin does not show stays a row, so no reward is ever hidden from view. Spin rows draw `spin.reward`. The Mint filter draws every mint. Since the reward is known from the server on whichever page it sits, no row jumps when the next page loads.

### Live rewards attach before the filter runs
In `useLiveActivity`'s message handler, each incoming mint is first offered to the pending spins the feed holds (paged and live), through `pairSpins`. A paired reward goes into a `rewards: Map<spinId, item>` on `LiveFeed` and is not added as a row in `all`. Only then do rows pass `matchesFilters`, so `type=spin` still learns rewards from mints it never lists. `pending` is re-derived against the newest transfer time the socket has sent, kept on `LiveFeed` before any filter runs, so a spin turns broke without a reload; no timer is needed, since the feed renders on each new transfer, and a stalled indexer leaves spins pending rather than broke.
*Alternative:* annotate live batches in the worker with a DB read. Rejected: an extra query per batch for something the browser can decide from rows it already holds.

### Row UI reuses the existing table
The spin row keeps the table's five columns (`activity-table.tsx`, `trades-view.tsx`); the objekt cell shows the spun objekt and the outcome, each objekt an `ObjektNameButton`. The exact look (arrow, labels, colour of broke and pending) is chosen from a throwaway prototype of variants before the row is built (tasks, group 3).

## Risks / Trade-offs

- [A purchase of the same artist lands right after a spin that broke] → paired as a reward. Rare (the sample had 22 other-artist cases in 9,363); accepted.
- [A chain of in-flight spins spans more than 20 minutes] → two pages can pair it differently. The fold then shows the reward as its own row rather than hide it; rare, accepted.
- [Two extra reads per page on a 300-row feed] → both are index probes per address; checked with `EXPLAIN ANALYZE` on prod read-only before the page change lands (task 2.3).
- [A reward hidden ahead of time, whose spin then loads showing another reward (two pages pairing a chain differently)] → the mint reappears as its own row and shifts the rows above it. Needs a 20-minute in-flight chain; accepted.
- [A reward listed in another tab before its spin was seen] → the profile tab is not live; a refetch corrects it.

## Migration Plan

No data migration. API fields are additive, so the web and the API ship together in one deploy; rollback is reverting the commit.
