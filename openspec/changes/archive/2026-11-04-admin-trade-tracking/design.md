# Design

## Context

See proposal.md for why. What the code already has:

- **Staff gate.** `moderator` (`packages/api/src/orpc.ts`) answers `NOT_FOUND` to anyone without a staff role. `admin-collections-and-banners` adds the `/mod` layout (`routes/(container)/mod/route.tsx`, the staff check in `beforeLoad`, returning `{ viewerRole }` as route context), the pure tab registry `STAFF_TABS` with `canOpenTab` (`features/moderation/staff-tabs.ts`), each tab route checking `canOpenTab(id, context.viewerRole)` in `beforeLoad` before its loader, and the `admin` router (`routers/admin.ts`, `/rpc` only) holding both `moderator` and `adminOnly` procedures. This change adds two entries and their routes to that.
- **Trade data** is in the app database: `offer` (`responded_at` is set on every ending: accept, decline, withdraw, counter, replace, expire, cancel), `trade` (`accepted_at`, `ended_at` set by `finishSettle`, `endTradeCancelled` and the worker's expiry), `trade_leg` (`verified_at`, `confirmed_at`, `away_at`, `untransferable_at`, `tx_hash`), `trade_substitute` and `trade_cancel_request`. A pending wrong copy or cancel request can outlive its trade. Every read that means "still waiting" filters on `trade.status = 'in_progress'` (and an open leg), as `readDeals` does.
- **Failed trades have two causes.** A break leaves `cancel_reason` null (`tradeOutcome`). Expiry writes `cancel_reason = 'expired'` on a failed or a cancelled trade (`trade-expiry.ts`).
- **Who is at fault** is the `fault` CTE in `services/reputation.ts`: on a failed trade, the side that still owed while the other did not.
- **Indexer delay** is stored by the worker in Redis `trade-verifier:seen` (`INDEXER_SEEN_KEY`, `{ seenUntil, readAt }`, refreshed every run). `trade-verifier:last` (`VERIFIER_LAST_KEY`) holds the last run's time. `isBehind` (`lib/indexer-seen.ts`) judges it. The "most indexer lag" in the worker's heartbeat is an hourly log maximum and is not stored.
- **Console trades.** `attachedTrades` (`services/moderation/reads.ts`) reads a trade's legs, hashes and auto-accepted copies relative to one account. `AttachedTrades` (`features/moderation/console/trades.tsx`) draws them with `ItemLabel`, `tradeStatusText` and `When`. The user's trade page reads through `fetchTrade`, which requires the viewer to be a party, and its Timeline (`timelineRows`) speaks as "You".
- **Production size** (`pg_class.reltuples`, read-only, 2026-11-04): offer 3,971, trade 1,074, trade_leg 4,792, trade_substitute 152, message 13,354, conversation 3,405, message_flag 392. `report`, `user_sanction` and `mod_audit` have never been analysed, so they are small.

## Goals / Non-Goals

**Goals:**
- Every number is read from rows the app already writes. No new table, column or worker job.
- No response behind the two tabs carries user-written text (spec: Staff trade view carries no user-written text; Message totals carry no text).
- The repeat-breaker list and the console's unfinished count use one definition of fault.

**Non-Goals:**
- Real-time updates. The tabs refetch on focus and on range change; totals may be up to 5 minutes old.
- A per-viewer time zone (see Decision 2).

## Decisions

### 1. Procedures live on the staff area's `admin` router, behind `moderator`

Five reads on the `admin` router: `admin.tradeTotals({ days })`, `admin.tradeAttention({ days })`, `admin.staffTrade({ tradeId })`, `admin.trackerHealth()`, `admin.messageTotals({ days })`, each a `moderator` procedure (both tabs are for moderators and admins). The router is never mounted in `openApiRouter`. All are new, so no open tab sends an older input shape.

`days` is `z.union([z.literal(7), z.literal(30), z.literal(90)])` with a default of 30. The route's `validateSearch` uses `.catch(30)`, so a bad link reads as 30 days (spec: Totals range), while a direct API call with a bad value is refused.

Services: `services/moderation/trade-tracking.ts` (totals, attention, repeat breakers, health), `services/moderation/staff-trade.ts`, `services/moderation/message-totals.ts`.

### 2. UTC days

Each day is `date_trunc('day', ts AT TIME ZONE 'UTC')`, the convention `collection_price_history` and the price-history cron already use. A viewer's time zone would split the cache per zone, and the SSR loader does not know the zone. The UI labels the range "UTC". **Check with the user:** staff in KST see each day start at 09:00.

### 3. SQL counts, TS shaping (pure, tested)

Each total is one grouped query returning `(day, key, count)` rows. The new `packages/api/src/lib/staff-totals.ts` holds:
- `rangeDays(days, now)`: the UTC dates of the range, oldest first, today included;
- `fillDays(rows, days, keys)`: a zero-filled `{ day, counts }[]` plus `sum`, so a quiet day shows 0;
- `percentile(sorted, p)`: linear interpolation, the same as Postgres `percentile_cont` (median 4.5 and p90 21 for the spec's example).

Time to complete reads the durations in seconds (`ended_at - accepted_at`) of the trades completed in the range and computes median and p90 in TS. A 90-day range holds at most a few thousand numbers. This keeps the math in a module `bun test` can reach without the database.

What each count reads:
- **Offers.** `created_at` for created. `responded_at` with `status` for each ending, and `cancel_reason` for the cancel split. An `accepted` offer is the trade start, so the tab shows "Accepted" once.
- **Trades.** `ended_at` with `status`. `cancel_reason` splits cancelled (`party`, `agreed`, `token_moved`, `not_transferable`, `expired`) and failed (null = broken, `expired`).
- **Messages.** Rows of `message` with `offer_id IS NULL`, by `created_at`. Unsent messages still count as sent.
- **Conversations started.** `conversation.started_at`, never `created_at`: a Message click creates the row without starting anything.
- **Flags.** `message_flag` by `created_at` and `category`. It is never joined to `message`.
- **Reports.** `report` by `created_at` and `reason`. If `report-help-and-reporter-note` has landed (`report.kind`), the query adds `kind = 'report'`, since a help request is not against an account. The spec says "reports filed against an account" so it holds either way. At apply time (2026-11-04) it had not landed: `report` has no `kind` column, so the query has no filter, and that change adds `kind = 'report'` to `services/moderation/message-totals.ts` when it lands.
- **Sanctions.** `user_sanction` by `created_at` and `type`.

The message-totals service selects only these columns. Its output schema names every field, so no text column can slip into a response.

### 4. Needs attention: one query, reasons folded per trade

A `UNION ALL` of `(trade_id, reason, at)`:
- `stalled`: `status = 'in_progress' AND accepted_at <= now() - interval '7 days'`;
- `failed`: `status = 'failed'` ended in the range;
- `away`: an open leg with `away_at` set, `at = away_at + AWAY_GRACE_HOURS`;
- `stuck`: an open leg with `untransferable_at` set;
- `copy`: a `pending` substitute on an open leg;
- `cancelAsk`: a `pending` cancel request.

The last four join `trade` with `status = 'in_progress'`. The rows are grouped by trade in TS and ordered by `accepted_at`, with a cap of 200 and a "showing 200 of N" line. The 7 days are their own constant, `STALLED_DAYS`. They are not tied to when Report a problem opens, which `report-help-and-reporter-note` moves to 3 days. **Check with the user:** keep 7, or follow the 3-day reminder.

`AWAY_GRACE_HOURS` already lives in `packages/api/src/schemas/offer.ts`, where the worker reads it.

### 5. Repeat breakers share the reputation's fault rule

`fault` moves out of `computeReputation` into an exported SQL fragment (`faultSql`) that both queries use, so the console's unfinished count and this list cannot disagree. The list counts, per culprit user id, the failed trades ended in the range where the account is the culprit (a break or an expiry, both `status = 'failed'`). Accounts with 2 or more are listed, most first, up to 50. Unlike the reputation, it does not follow a culprit's address to a new account: it is a lead, and the console page shows the link history.

A trade cancelled with `token_moved` is left out. It ends Cancelled only when nothing was sent, so nobody lost an objekt, and the leg that broke is not recorded reliably (`away_at` is a working mark, not a record). Production (read-only, 2026-11-04) has 1,071 completed, 30 cancelled (29 by a party, 1 by agreement), 2 failed and 34 in-progress trades, and no `token_moved` cancel at all, so the list will be short for now.

### 6. Staff trade view: a neutral read, not `fetchTrade`

`fetchTrade` is party-only and its Timeline speaks as "You", so it does not fit. `attachedTrades`' leg read is split into a neutral `tradeDetail(ids)`, which returns legs with `fromUserId` and `toUserId`. `attachedTrades` maps it to `fromTarget` as today. `staffTrade(id)` adds:
- the offer's `id` and `created_at` (Proposed) — **never `note` or `caution`**;
- the substitutes, cancel requests, and both parties through `fetchPartners`.

A pure `lib/staff-timeline.ts` (tested) builds dated rows in the third person: Proposed, Accepted, each verified or confirmed leg, each wrong copy recorded and decided, each cancel request and answer, an away or stuck mark, and the ending. It does not reuse `timelineRows`, which needs a viewer.

Web: the leg list in `features/moderation/console/trades.tsx` becomes a `TradeLegs` component taking giver and receiver names, which `AttachedTrades` uses. The staff view draws its legs as a table (spec: Staff trade view layout) while the console keeps its list, so the two share the leg's parts instead (`LegStateBadge`, `LegCopyLine`, `ItemLabel`, `When`), not the list itself (changed at apply: one component cannot be both the console's list and the staff table). `AttachedTrades`' number becomes a `Link` to `/mod/trades/$tradeId`. The trade page's `Hash` is private to `trade-timeline.tsx` and has no link, so the staff view adds a small hash link that copies or opens the explorer. The explorer base URL goes in one constant. Its form (`https://abscan.org/tx/<hash>` is assumed) is checked in task 4.1 before it is written.

### 7. Tracker health reads what the verifier stores

`readIndexerSeen` (`services/offer/trades.ts`) is exported. Health returns `{ seenUntil, readAt, behind, verifierLastRun }` or `{ state: "unknown" }`. A trade page reads a Redis failure as "behind", to fail safe. Staff instead see "unknown" (spec: Tracker health), so the service checks for `null` before calling `isBehind`. Health also returns counts of open legs, open legs with `away_at`, open legs with `untransferable_at` and pending copies, all gated on `in_progress`.

Dropped from the brief: "legs whose transfer exists but are not verified yet". Finding them means re-running the verifier's matching (`matchLegs` over indexer transfers) from the web server. That is the computation the verifier owns, and doing it twice could disagree with it. Indexer delay plus the verifier's last run answer the same question: is the tracker keeping up?

### 8. Caching: totals only, 5 minutes

`tradeTotals` and `messageTotals` read through `getCache` with keys `mod:trade-totals:1:<days>:<utc-date>` and `mod:message-totals:1:<days>:<utc-date>`, a 300-second TTL, and `countedAt` stored in the value. The attention list, staff trade and health are live, since staff open them to act. The scans are cheap today. The cache keeps a tab left open, or several staff on the same range, from re-scanning `message` as it grows. Bump the version in the key when the stored shape changes. Trap: a dev server must use a local `REDIS_URL` (the current `.env.local` does), or it would store totals counted from the local database under the key production serves.

### 9. No new index

At the sizes above, every range scan is a sequential scan of at most about 13,000 rows. That is milliseconds, and cached on top. A btree index would add write cost to `message` and `offer`, the two hottest inserts, for no gain yet. Each query filters on the column an index would cover (`message.created_at`, `offer.created_at` / `responded_at`, `trade.ended_at`, `trade.accepted_at` with `status = 'in_progress'`). Adding `(created_at)` on `message`, or a partial `(accepted_at) WHERE status = 'in_progress'` on `trade`, is a one-line `db:generate` when needed. Revisit when `message` passes about 500,000 rows or a totals read logs over 200 ms. Task 2.6 records an `EXPLAIN ANALYZE` (read-only, production) of the 90-day queries as the baseline.

Baseline (task 2.6, `EXPLAIN (ANALYZE, BUFFERS)`, read-only, production, 2026-11-04, a 90-day range from 2026-08-07), execution time: offer totals 8.1 ms, trade totals 2.0 ms, time-to-complete durations 1.1 ms, needs attention 1.6 ms, repeat breakers 0.5 ms, tracker health counts 1.0 ms, message totals 17.6 ms, most flagged 0.7 ms. Planning adds 1 to 4 ms each. None is near 200 ms.

### 10. No audit entry for reads

Opening a tab or a staff trade view writes no `mod_audit` row. No console read is audited today (`moderation.account`, `addressHistory`). The staff trade view shows chain data and trade states, not private text. One row per view would also flood the account audit log that moderators read. If the user wants it, `mod_audit.action` has no CHECK constraint, so `view_trade` (with `detail: { tradeId }`) needs no migration: an `AUDIT_ACTIONS` entry and its label in `features/moderation/labels.ts`, as `admin-collections-and-banners` adds `banner_remove`.

### 11. UI

The layouts were picked from a prototype (`prototype/admin-area`, variant A of each screen):
- **Trade tracking** is a dashboard, top to bottom: the header with the range control, Go to trade and "counted at"; Tracker health as one strip; a row of figure tiles (offers sent, accepted with its share of offers, completed, cancelled, failed, accept → complete); per-day bar charts of offers sent and trades completed side by side; why offers were cancelled as labelled bars; the Needs attention table; Repeat breakers.
- **Staff trade view**: the header (number, status, accepted time, both accounts with any active sanction), a line saying offer notes and chat are not shown, then the legs as a table beside the timeline from `lg`, stacked below it.
- **Message totals**: one tile per measure, each with its range sum and a per-day bar chart, a tile for flags by category, then the most-flagged table.

Both tabs follow the Look (`apps/web/AGENTS.md`):
- per-day charts are the vendored `components/ui/chart` (Recharts) bar chart, one neutral series (completed trades in `success`, flags in `warning`, reports and sanctions in `destructive`), each bar naming its day and count on hover and focus, with the same days as a visually hidden table so a screen reader gets every number;
- counts in `tabular-nums` sans, the range sum as the tile's figure;
- the range as a segmented control in the URL;
- `T-1042` and hashes in `font-mono`;
- status chips from `lib/tone.ts` through `Badge`.

Account names come from `fetchPartners`, the console's name source, and link to `/mod/reports/$userId`. All strings are Paraglide `m.*` in en, ko and ja.

## Risks / Trade-offs

- [Totals lag by up to 5 minutes] → The tab shows "counted at"; the attention list is live.
- [UTC days split a KST evening across two days] → Labelled UTC; a time-zone input can be added later with the zone in the cache key.
- [`admin-collections-and-banners` is not applied yet] → Task 1.1 waits for it; if its router or registry lands under other names, only the mount points move.
- [The message tab could leak text through a careless `select()`] → Explicit column lists and a zod output schema (`schemas/staff-totals.ts`) whose only strings are dates, enums, user ids and names; the procedure's `.output()` strips anything else.
- [The explorer URL is assumed] → Verified in task 4.1; a single constant.

## Migration Plan

No migration. Deploy web and API together; the worker is unchanged. Rollback is a revert.

## Open Questions

- Should the repeat-breaker threshold (2) or window (the chosen range) differ? This can be tuned after use, without a spec change beyond the number.
