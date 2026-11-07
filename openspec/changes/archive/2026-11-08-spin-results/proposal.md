# Proposal

## Why

COSMO Spin takes one objekt and, usually within half a minute, mints the spinner a new one, or nothing when the spin breaks. The chain records these as two unrelated transfers (a send to the Spin address, then a mint from the null address), so `/activity` and a profile's Activity history show a spin and its reward as separate rows and never say what a spin produced or that it broke.

## What Changes

- A spin row on `/activity` and on the profile Activity history tab (`/@{nickname}/trades`) shows its outcome: the reward objekt, **broke** (nothing came), or **pending** (too recent to tell).
- A spin is paired with its reward per spinner, first in first out: the reward is the first mint to the spinner after the spin, of the same artist, within 10 minutes, not already claimed by an earlier spin of that spinner.
- In the **All** view of both pages, a mint paired as a spin reward is folded into its spin row and no longer shown as a row of its own. The **Mint** filter still lists it; the **Spin** filter shows spin rows with their outcome.
- On `/activity`, a reward arriving live updates its spin row in place instead of appearing as a new row.
- The public API (`GET /api/v1/activity`, `GET /api/v1/transfers/{address}`) and the live socket gain optional, additive fields: the outcome on a spin row, and on a reward mint row the spin it belongs to. Existing fields and row order do not change.

## Non-goals

- No change to the indexer, its schema or its migrations; the pairing reads transfers already indexed.
- No spin statistics (break rate, reward odds) and no new filter such as "broke only".
- The objekt drawer's timeline and the serial transfers list keep showing raw transfers.
- Spins before the 10-minute rule held (no historical audit); every spin is paired by the same rule.

## Capabilities

### New Capabilities

- `web-spin-results`: how a spin is paired with its reward and what outcome (reward, broke, pending) it carries, shared by every surface that lists transfers.

### Modified Capabilities

- `web-activity`: the paged feed folds rewards into spin rows in the All view, and live updates fold an arriving reward into its spin row.
- `web-profile`: the Activity history tab shows spin outcomes and folds rewards in its All view.
- `api-openapi`: the activity and address-transfers responses carry the optional spin outcome and reward link.

## Impact

- `packages/api`: `services/activity-feed.ts`, `services/transfers.ts`, `services/activity-batch.ts` (live rows), the activity and transfers schemas; a new pure pairing module with `bun test`.
- `apps/web`: `features/activity` (row, table, live feed merge), `features/profile/trades/trades-view.tsx`; new Paraglide messages in en, ko and ja.
- Database: reads use the existing partial index `idx_transfer_mint_to_ts_id` (mints by receiver and time) and `idx_transfer_from_ts_id`; no migration.
