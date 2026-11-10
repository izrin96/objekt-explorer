# Proposal

## Why

`apps/web/src/routes/api/` still serves ten hand-written anonymous GET routes that predate oRPC. Each calls the same service as an oRPC procedure that `/api/v1` already serves and documents. Nothing in the repo calls them: the web app reads through `/rpc` and `/api/v1`, and the worker and indexer call neither. They are a second, undocumented copy of each read, and a second surface to keep in step.

## What Changes

- **BREAKING (outside clients):** remove these routes. Each answers 404 afterwards; its `/api/v1` path returns the same service result, though errors differ (the legacy routes answer `{ error }`, `/api/v1` answers oRPC's error JSON).

  | Removed | Use instead |
  | --- | --- |
  | `/api/collection` | `/api/v1/collections` |
  | `/api/objekts/owned-by/{address}` | `/api/v1/objekts/owned-by/{address}` |
  | `/api/objekts/held-by/{address}` | `/api/v1/objekts/held-by/{address}` |
  | `/api/transfers/{address}` | `/api/v1/transfers/{address}` |
  | `/api/objekts/list/{slug}` | `/api/v1/collections/{slug}/serials` |
  | `/api/objekts/metadata/{slug}` | `/api/v1/collections/{slug}/metadata` |
  | `/api/objekts/transfers/{slug}/{serial}` | `/api/v1/collections/{slug}/serials/{serial}/transfers` |
  | `/api/user/search` | `/api/v1/users/search` |
  | `/api/activity` | `/api/v1/activity` |
  | `/api/live-sessions` | `/api/v1/live-sessions` |

- Regenerate `routeTree.gen.ts`.
- Reword two schema comments that name the deleted routes.
- The `api-openapi` spec stops promising the legacy routes.

No access-log check and no redirect release come first (user decision, 2026-11-10).

## Non-goals

- `GET /api/open-app` stays (user decision).
- `auth.$.ts`, `errors.ts`, `healthcheck.ts`, `v1.$.ts`, `v1.collections.ts` and `rpc.$.ts` are untouched.
- No rate limit is added to `/rpc` or `/api/v1`. Removal does not make these reads less open: `/api/v1` and `/rpc` stay as unthrottled as the legacy routes were, except `live.sessions` and `user.search`, which limit inside the shared code. A per-procedure limit is a separate change, since `/rpc` batches calls.
- No service or procedure changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: "Stable contracts", "Held-by first-copy fields" and "Transfers sort order" stop naming the legacy routes. The `slim-list-entries` change also has an `api-openapi` delta; it touches other requirements, and whichever archives second merges against the other.
