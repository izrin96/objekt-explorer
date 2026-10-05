## Why

`/api/v1` documents ten reads, but the app answers more public questions than that: the
market, a collection's rarity and holders, a profile's pins, locks and hover card, and the
system status. Third-party clients can reach those only through the undocumented `/rpc`
transport today.

## What Changes

Ten existing public reads join `/api/v1` with an OpenAPI route and a documented response.
Every new operation is a `GET`:

| Procedure | Route | Tag |
| --- | --- | --- |
| `market.summary` | `/market` | Market |
| `market.rates` | `/market/rates` | Market |
| `market.marketListings` | `/market/{collectionSlug}/listings` | Market |
| `market.stats` | `/market/{collectionSlug}/stats` | Market |
| `collections.rarity` | `/collections/rarity` | Collections |
| `collections.holders` | `/collections/{collectionSlug}/holders` | Collections |
| `profile.preview` | `/profiles/{address}` | Profiles |
| `pins.list` | `/profiles/{address}/pins` | Profiles |
| `lockedObjekt.list` | `/profiles/{address}/locked-objekts` | Profiles |
| `status.get` | `/status` | Status |

- Each procedure gets a named output schema, put in the document through `documented()`.
  The four market and holders schemas exist already. Rates, rarity, pins, locks, the
  profile preview and status gain new ones.
- `holders` and `marketListings` take `offset` and `limit` from the query string, so those
  fields accept a numeric string as well as a number.
- The three profile reads take a bare address string over `/rpc`, but a path parameter has
  to be an object field. They get `/api/v1`-only procedures that take `{ address }` and
  share the read with the `/rpc` ones, which stay as they are, so a tab opened before the
  deploy keeps working.
- The services, privacy checks and caching are otherwise unchanged. `/rpc` keeps serving
  all ten with the same inputs.

## Non-goals

- Lists (`findPublic`, `listEntries`, `profileLists`, `export`), `compare`, artists and
  filter data. The ones that read the selected-artists cookie need an `artists`
  parameter designed first.
- Any procedure that writes or needs a signed-in account, and the cookie or session
  procedures (`config.setArtists`, `config.getSelectedArtists`, `user.currentUser`).
- Rate limiting, API keys, or response caching headers for the new operations.
- New legacy `/api` routes. These procedures never had one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: the public operation list grows from ten to twenty, numeric pagination
  parameters accept query-string values, and profile reads follow the profile's privacy
  setting.

## Impact

- `packages/api/src/routers/{market,collections,status,index}.ts`: `.route()`, `.output()`,
  and the router entries. A new `routers/profiles.ts` holds the three `/api/v1` profile
  procedures.
- `packages/api/src/services/`: the profile preview, pins and locked-objekts reads move out
  of their routers into `profile.ts` and the new `pins.ts` and `locked-objekts.ts`, so both
  procedures of each read call one function.
- `packages/api/src/schemas/`: new output schemas in `market`, `collections`, `pins` and
  `profile`, and a new `status.ts`. The `holders` and `marketListings` inputs coerce
  `offset` and `limit`.
- The `/api/v1/spec.json` document and the reference page at `/api/v1/` gain the four
  tags and ten operations. No dependency changes.
