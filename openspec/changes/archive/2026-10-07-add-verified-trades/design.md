## Context

`add-trade-offers` creates `trade` and `trade_leg` rows on accept. Each leg holds:
- `from_addresses` and `to_addresses`, snapshotted at accept;
- `collection_slug`, plus `objekt_id` (null means any copy);
- `open`, and the empty columns `verified_at`, `tx_hash` and `verified_objekt_id`.

Expiry there is lazy: an `open` offer past `expires_at` reads as expired.

The indexer writes every transfer to `transfer`, with columns `id`, `from`, `to`, `timestamp`, `objekt_id`, `collection_id` and `hash`. These indexes cover the lookups below:
- `idx_transfer_objekt_timestamp_desc`;
- `idx_transfer_collection_from_id`.

After each batch, the indexer also publishes the transfers as JSON on the Valkey `transfers` channel. Pub/sub is fire-and-forget: a subscriber that is down misses messages.

The worker (`apps/worker`) runs `Bun.cron` jobs, has its own Valkey client, and writes notifications the way `want-alerts.ts` does: rows, then `notify:<userId>` publishes.

## Goals / Non-Goals

**Goals:**
- A missed pub/sub message or a worker restart never loses a verification. The transfer table is the source of truth, and the channel only makes it faster.
- One transfer can satisfy at most one leg.
- The matching rules are a pure, tested module.
- Reputation is computed from rows, never stored as a counter that can drift.

**Non-Goals:**
- Chain reorg handling beyond what the indexer already does.
- Running verification in the web process.

## Decisions

### D1. Data
One migration:
- **`trade_feedback`**: `trade_id`, `from_user_id`, `to_user_id`, `rating` (CHECK `positive | neutral | negative`), `created_at`, `updated_at`.
  - Primary key `(trade_id, from_user_id)`.
  - Index on `to_user_id`, for reputation.
- **`trade_leg`** gains `transfer_id uuid UNIQUE`. One indexer transfer can verify only one leg anywhere.
- **`trade_leg`** gains the partial index `trade_leg_open_idx (trade_id) WHERE open`.
- **`trade`** gains `reminded_at`.
- **`report`** gains `trade_id` (`references trade`, `on delete set null`).

### D2. Matching rules (`apps/worker/src/lib/trade-match.ts`)
The module is pure, like `want-alert-match.ts`.

**Inputs:**
- the open legs, each with its trade's `window_start`: the offer's `created_at`, not the accept time. A sender who transfers early, or an indexer lag around accept, still resolves.
- the candidate transfers, sorted by `(timestamp, id)`.

Each side's address set is the leg's snapshot plus that user's current linked addresses. An address belongs to one account (`user_address_address_idx`), so the union never credits someone else, and a later unlink can't strand a leg. All addresses are compared in lowercase.

**Specific leg:** walk the transfers of that `objekt_id` from `window_start` on.
- A transfer between two of the giver's own addresses is skipped.
- The first other transfer decides:
  - **verified**, if it goes from the giver's set to the receiver's set;
  - **broken**, otherwise.

**Any-copy leg:** the first transfer of a token in the collection, from the giver's set to the receiver's set, whose `transfer_id` isn't already used. Two any-copy legs of the same collection take two distinct transfers. An any-copy leg never breaks.

**Output:** per leg, `verified { transferId, txHash, objektId, at }`, `broken { transferId }` or `pending`.

Tests cover:
- verify;
- a move between the giver's own addresses, then verify;
- broken to a third party;
- two any-copy legs needing two transfers;
- a transfer before `window_start` is ignored;
- a mixed-case address.

### D3. The job
`apps/worker/src/job/trade-verifier.ts` exports `runTradeVerifier()`. Two things trigger it:
- **A 2-minute cron**, run once on startup like the other jobs.
- **A subscription to `transfers`.** For each message the job checks the batch against an in-memory watch set: the open legs' objekt ids and collection uuids, plus the specific objekt ids in open offers. On a hit it schedules a run, debounced by 5 s. The watch set refreshes at the end of every run.

Runs are single-flight: an in-process flag, plus `pg_try_advisory_lock` so a second worker replica skips the run.

**Each run:**
1. Load the open legs with their trade, the window start and the address sets (one query).
2. Read candidate transfers from the indexer:
   - specific legs: `objekt_id = ANY($ids) AND timestamp >= $minStart`;
   - any-copy legs: `collection_id = ANY($uuids) AND "from" = ANY($addresses) AND timestamp >= $minStart`.

   Collection slugs map to uuids through one `collections` read.
3. Match each trade's legs (D2), then write per trade in a transaction holding `FOR UPDATE` on the trade row:
   - verified legs close, with `verified_at`, `tx_hash`, `verified_objekt_id` and `transfer_id`;
   - when every leg is verified, the trade becomes `completed` with `ended_at`;
   - a broken leg makes the trade `cancelled` (reason `token_moved`) if no leg was verified yet, or `failed` if one was. Either way every leg closes, so the reservations free up.

   A unique violation on `transfer_id` means another leg got there first. That leg is left pending.
4. Offer upkeep (D4), then stall reminders (D6).
5. Write notifications in each transaction. After commit, publish `notify:<userId>`. Publish `chat_changed` too: the worker's Valkey client publishes the same JSON `user-socket` relays, so the offer card's progress updates live.

*Alternatives*:
- Reading `list_event_outbox` was rejected: `drainOutbox` deletes those rows, and it only covers transfers out of list owners.
- Subscribing in the web process was rejected: every web instance would run the job, and it would compete with request handling.
- Pub/sub alone was rejected: it loses messages.

### D4. Offer upkeep
- **Expiry**: `UPDATE offer SET status = 'expired', responded_at = now() WHERE status = 'open' AND expires_at <= now() RETURNING …`. Both parties get an `offer` notification with the event `expired`.
- **Moved objekts**: read `objekt.owner` for the specific objekt ids in open offers, in batches of 500. An owner outside its side's current linked addresses cancels the offer with reason `token_moved`, and both parties are notified.

`expired` joins `add-trade-offers`'s offer events. The lazy read there stays as a fallback.

### D5. Reputation
`services/reputation.ts` provides `reputationOf(userIds)`, which returns per user:
- `verified`: the count of `completed` trades where the user is `user_a` or `user_b`;
- `positive`: `round(100 × positive / (positive + negative))`, or null with no non-neutral ratings;
- `since`: the month of `user.created_at`.

One grouped query per batch. The value is cached per user in Valkey (`rep:<userId>`, 10 minutes), and the worker and `offer.rate` delete it when it changes.

It is attached where an account id is already resolved:
- the chat thread's partner (the header trust line);
- `trade.browse` posts (`userId`);
- For you partners;
- the profile read (only when `userId` is present);
- `offer.trade`.

A profile that hides its user gets no reputation, so it can't tie an address to an account.

*Alternative*: counters on `user`. Rejected: they drift, and a trade later found bad would need compensating writes.

### D6. Who sends first, the cancel lock and stalls
**Who sends first**: `firstSender(a, b)` in `packages/api/src/lib/offer-rules.ts`. The party with fewer `verified` trades sends first. On a tie, the account created later sends first, and on a further tie, `user_b`. `offer.trade` returns the result, along with whether that party's legs are already verified ("You did, so it's their turn").

**Cancel lock**: `cancelTrade` refuses with `locked` once any leg has `verified_at`.

**Stall reminders**: each verifier run finds `in_progress` trades accepted at least 72 hours ago whose `reminded_at` is null. Each party with an open leg they give gets one `trade` notification with the event `reminder`, and the run sets `reminded_at`.

**Report a problem**: `offer.trade` returns `canReport` as true when the trade is `failed`, or `in_progress` and accepted at least 7 days ago. `moderation.report` accepts an optional `tradeId`, which must name a trade between the reporter and the target. The usual 24-hour limit applies.

The console's account page lists the trades attached to open reports: each one's legs, states, hashes and timestamps. There is still no message text beyond the shared excerpt.

### D7. Feedback
`offer.rate({ tradeId, rating })`:
- is open to a party of a `completed` trade until `ended_at + 14 days`;
- upserts the rating and deletes both `rep:` keys.

`offer.trade` returns the caller's own rating. Nobody's single ratings are exposed to the other party or to anyone else.

### D8. Notifications
A new type `trade`. Its payload is `{ tradeId, event, partner }`, where `event` is one of `leg_verified | completed | cancelled | failed | reminder`. `groupKey` is `trade:<tradeId>`. The Notifications section gains the Trades switch, on by default.

### D9. Web
- **`features/offers/trust-line.tsx`**: a single line, for example "31 verified · 100% · since Mar 2025". It reads "No verified trades yet" when the count is 0. It goes in:
  - the thread header;
  - `browse-post.tsx` and `partner-row.tsx`;
  - `profile-header.tsx`;
  - the trade page.
- **The trade page**: each leg shows a state chip. Verified shows the shortened hash and its time. It also shows the who-sends-first panel, and Cancel only when allowed.
  - **Feedback**: once the trade is completed, a Positive, Neutral or Negative control (the segmented `Tabs` style the For you filter uses).
  - **Report a problem**: when `canReport`, it opens the existing `ReportDialog` with the trade attached and the reason set to scam.
- **The offer card**: an accepted offer shows "n of m transfers verified" and links to the trade.

The design prefers the existing `ReportDialog`, the `Tabs` style and the notification rows. The trust line is new because no existing component shows reputation.

## Risks / Trade-offs

- **[Indexer lag]** Verification waits on the indexer. → The trade page reads "Waiting for transfer, checked <time>", using the last run time the worker writes to Valkey (`trade-verifier:last`).
- **[A watch set built by a large any-copy query]** → Any-copy candidates are limited to the open legs' collections and their givers' addresses, which is a small set.
- **[A false break from a transfer to the receiver's address they never linked]** → The trade is cancelled or failed, not silently passed. The parties see the reason, and failed trades can be reported, so a moderator decides.

## Migration Plan

Create one migration with `db:generate` and apply it locally only. At ship it goes after the `add-trade-offers` migration. Deploy the worker together with the web build.

The job is additive. Rolling back means stopping the cron and subscription, then dropping `trade_feedback`, `trade.reminded_at`, `report.trade_id` and `trade_leg.transfer_id`.
