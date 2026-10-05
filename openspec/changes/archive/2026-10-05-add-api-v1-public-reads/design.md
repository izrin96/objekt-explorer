## Context

`/api/v1` is an `OpenAPIHandler` over `openApiRouter` (`packages/api/src/routers/index.ts`),
served by `apps/web/src/routes/api/v1.$.ts`. It passes the request headers as context, so
`optionalAuthed` procedures see the caller's session. Responses go into the document
through `documented()`, which describes a schema without validating against it at runtime.
That was the call for the first batch, and it holds here.

The ten procedures in the proposal already serve `/rpc`. Discovery found two things that
stop them from being exposed with only a `.route()`:

- `pins.list`, `lockedObjekt.list` and `profile.preview` take a bare address string
  (`.input(addressSchema)`). A path parameter has to be a field of an object input.
- `holdersInputSchema` and `marketListingsInputSchema` declare `offset` and `limit` as
  `z.number()`. The OpenAPI handler hands query values over as strings, so `?limit=5`
  fails validation.

## Goals / Non-Goals

**Goals:**
- One procedure per operation, shared by `/rpc` and `/api/v1`, as in the first batch.
- The ten existing operations keep the same document paths, parameters and response bodies.

**Non-Goals:**
- No runtime output validation (`documented()` only).
- No change to the reads, caching or privacy logic; the three profile reads only move into
  services.

## Decisions

**`/api/v1`-only procedures for the three address reads.** Add `addressInputSchema =
z.object({ address: addressSchema })` to `schemas/common/address.ts`. A new
`routers/profiles.ts` holds `preview`, `pins` and `lockedObjekts`, which take it, and
`openApiRouter` mounts it as `profiles`. The read itself moves into a service
(`fetchProfilePreview` in `services/profile.ts`, `fetchPins` with `getValidPins` in
`services/pins.ts`, `fetchLockedObjekts` in `services/locked-objekts.ts`), and both
procedures call it. The `/rpc` procedures keep their bare-string input, and the web app is
untouched.
*Alternative:* switch the `/rpc` procedures to `{ address }` and update the web call sites.
That keeps one procedure per operation, but a tab opened before the deploy would get a 400
from pins, locks and the hover card until it reloads.

**`z.coerce.number<number>()` for `offset` and `limit`.** These are the only numeric
query inputs in the batch. `serialTransfersInputSchema` already coerces `serial` this
way. The `<number>` type argument keeps the input type `number`, so the typed RPC client
still rejects a string at compile time. A number sent over `/rpc` coerces to itself.
*Alternative:* `SmartCoercionPlugin` on the OpenAPI handler. It would need
`@orpc/json-schema` as a new dependency, and it would also coerce the inputs of the ten
operations already published, which puts their stable contract at risk.

**Output schemas, one file per namespace.** Reuse the schemas that exist and add the rest
next to their namespace:
- `market.ts`: reuse `marketListingsOutputSchema` and `marketStatsOutputSchema`. Add
  `marketSummaryOutputSchema` (an array of `marketSummaryEntrySchema`) and
  `currencyRatesOutputSchema` (`z.record(z.string(), z.number())`).
- `collections.ts`: reuse `holdersOutputSchema`. Add `collectionRarityOutputSchema`
  (an array of `{ slug, count }`).
- `profile.ts`: add `profilePreviewOutputSchema` (`publicProfileSchema` extended with
  nullable `counts`). `ProfilePreview` becomes its `z.infer`, which is the same type.
- `pins.ts`: add `pinsOutputSchema` (an array of `{ tokenId: string, order: number }`).
- New `locked-objekts.ts` with `lockedObjektsOutputSchema` (an array of `{ tokenId }`),
  because no schema file covers that namespace any more.
- New `status.ts` with `statusOutputSchema`: `database.latestTransferDate` (a nullable
  string), `database.behind`, and `cosmo.status` (`up | partial | down`).

**Paths.** The profile reads live under `/profiles/{address}`, not `/users/{address}`, so
they cannot shadow `/users/search`. The market summary takes the bare `/market`, and the
per-collection market reads nest under `/market/{collectionSlug}/…`, which keeps one tag
per path prefix.

**Optional session on v1.** No change. `holders` and `profile.preview` read the session
from `context.headers`. `pins.list` and `lockedObjekt.list` read it through
`isAddressHiddenFromCaller`, which works inside the request. A same-origin browser call
therefore gets the owner's view, and a third party gets the anonymous view the spec
requires.

## Risks / Trade-offs

- [Two procedures per profile read can diverge] → Both call the same service function, so
  only the input shape and the route differ.
- [`marketListings` and `holders` page through results without a per-caller limit, and
  the listings query is not cached] → Rate limiting is out of scope. `holders` reads its
  four-minute ranking cache. If abuse shows up, add `isIpRateLimited` to that operation.
- [A `documented()` schema drifts from what the handler returns] → `documented()` types
  the procedure's output, so a handler returning a value outside its schema fails to
  compile, and no `satisfies` line is needed. A handler returning fields the schema leaves
  out still compiles, which the `/rpc` and `/api/v1` body comparison covers.

## Migration Plan

Deploy the change as one release. It needs no data or environment changes, and no `/rpc`
input changes, so open tabs keep working. To roll back, revert the commit.
