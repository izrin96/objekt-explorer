## Why

An API client building a per-collection view of a collector needs three details per collection: the lowest serial held, that copy's token ID, and when the oldest still-held copy arrived. `held-by` returns only `copies`, so the client pages through `owned-by` for them, about ten 8 MB pages for a big collector. It also needs the date of an address's first transfer for a "since" line, and `/transfers/{address}` only pages newest first, so the client binary-searches the cursor, about 20–30 requests per address.

## What Changes

- **`GET /objekts/held-by/{address}`**: each collection row gains three fields, computed over the copies the address holds now:
  - `minSerial`: the lowest serial held in that collection.
  - `minSerialTokenId`: the token ID of that copy.
  - `firstReceivedAt`: the ISO timestamp of the earliest `receivedAt` among the held copies.
  Existing fields (`copies` and the collection's fields) are unchanged. Additive, not breaking.
- **`GET /transfers/{address}`**: a new `order` query parameter, `desc` (default, today's behaviour) or `asc`. With `asc` the same response body and cursor shape page oldest first, so the first row of the first page is the address's first transfer under the given filters. Every existing filter (`type`, the collection facets, `at`) applies the same way in both orders.
- The same fields and parameter reach every surface that shares these services: `/api/v1`, the `/rpc` procedures `objekts.heldBy` and `transfers.byAddress`, and the legacy `/api/objekts/held-by/$address` and `/api/transfers/$address` routes.
- The OpenAPI document describes the three new fields and the `order` parameter.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-openapi`: adds requirements for the held-by first-copy fields and the transfers `order` parameter.

## Non-goals

- A `limit` parameter on `/transfers/{address}`. The first `asc` page still returns up to 150 rows; one request replaces the binary search, which is the win asked for.
- A dedicated "first transfer" or "since" endpoint.
- Per-copy detail beyond the lowest serial (for example every serial held) on `held-by`; `owned-by` stays the way to list tokens.
- Changing privacy: a hidden address still returns no collections and `hide: true` on transfers.
- Using the new fields in the web app. The profile's Spin view reads `held-by` and ignores them.
- New indexes or a migration.

## Routes

- `/api/v1/objekts/held-by/{address}`, `/api/v1/transfers/{address}`
- `/rpc` `objekts.heldBy`, `transfers.byAddress`
- `/api/objekts/held-by/$address`, `/api/transfers/$address` (legacy)

## Impact

- **`packages/api`**:
  - `services/owned.ts`: `countHeld` aggregates `min(serial)` and `min(received_at)` and looks up the lowest-serial token; the Redis key moves to a new version so cached rows without the fields are not served.
  - `schemas/common/objekt.ts`: `heldObjektSchema` gains the three fields.
  - `schemas/transfers.ts`: `order` on the filters schema, defaulting to `desc`.
  - `services/transfers.ts`: direction-aware cursor comparison, `ORDER BY` and merge of the from/to result sets.
- **`packages/lib`**: `HeldFields` in `types/objekt.ts` gains the three fields.
- **`apps/web`**: the legacy `/api/transfers/$address` route reads `order`; the legacy held-by route needs no change.
- **Compatibility**: old `/rpc` inputs without `order` still validate and behave as today, so open tabs keep working.
