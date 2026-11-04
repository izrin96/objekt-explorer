# Proposal

## Why

Staff see a trade only when a report has it attached, and see chat only as one account's report and flag counts. Nothing shows whether trading as a whole is healthy: how many offers become trades, how many trades fail or stall, who keeps breaking them, or whether the tracker has stopped reading the chain. Staff learn of it from a report.

## What Changes

- **Trade tracking tab** (`/mod/trades`, moderators and admins):
  - **Totals per day** over 7, 30 or 90 UTC days: offers created, accepted, declined, withdrawn, countered, expired and cancelled by reason; trades completed, cancelled by reason, and failed (broken or expired); time from accept to completed, as a median and 90th percentile.
  - **Needs attention**: trades in progress 7+ days after accept, failed trades, legs whose objekt left the giver or became non-transferable, wrong copies waiting on the receiver, and requests to cancel waiting on an answer.
  - **Repeat breakers**: accounts at fault in two or more failed trades in the range (the unfinished-count rule), linked to their console page.
  - **Tracker health**: indexer delay, as the trade verifier already stores it, and the verifier's last run.
  - **Go to trade** by number.
- **Staff trade view** (`/mod/trades/$tradeId`): status, both accounts linked to their console page, legs, transfers linked to the chain explorer, wrong copies, cancel requests and a dated timeline. No offer note, no message text. Trades attached to reports in the console link to it.
- **Message totals tab** (`/mod/messages`, moderators and admins): messages and conversations started per day, scam-phrase flags per day by category, new reports by reason, new sanctions by type, and the most-flagged accounts in the range. Counts only: never message text, offer notes or excerpt content.

## Capabilities

### New Capabilities

- `web-admin`: the staff area, created by `admin-collections-and-banners` with its tab strip, per-tab roles and not-found rule. This change adds two tabs and the staff trade view; if that change archives first, this delta only adds requirements.

### Modified Capabilities

None. `web-moderation`, `web-verified-trades` and `web-trade-offers` are read, not changed.

## Depends on

`admin-collections-and-banners` (the `/mod` tabs, not-found rule, per-tab roles, `admin` router). Apply it first.

## Non-goals

- Reading conversations. `web-moderation`'s Roles rule stands: message text reaches staff only through shared excerpts.
- Acting on a trade from the staff view (ending it, verifying a leg). The view is read-only.
- CSV export and custom date ranges.
- Re-running the verifier's matching to find a transfer whose leg hasn't verified yet. Tracker health shows indexer delay and verifier recency instead.
- Auditing reads: no console read is audited today.

## Routes

- `/mod/trades`, `/mod/trades/$tradeId`, `/mod/messages` (new)
- `/mod/reports/$userId` (an attached trade's number links to the staff trade view)

## Impact

- `packages/api`: five staff reads (trade totals, attention list, staff trade, tracker health, message totals), none on `/api/v1`; pure, tested modules for day buckets, percentiles and the staff timeline; the reputation's at-fault rule shared, not copied; `readIndexerSeen` exported; totals cached 5 minutes.
- `apps/web`: two tab routes and the trade view, built from the console's trade, `When` and `ItemLabel` parts; Paraglide strings in en, ko and ja.
- `packages/db`: no migration. At production's size (about 4,000 offers, 1,100 trades, 13,000 messages) the scans need no new index; see design.md.
