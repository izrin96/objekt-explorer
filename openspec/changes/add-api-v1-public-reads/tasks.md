## 1. Baseline

- [x] 1.1 With a dev server (`vite dev --port 3100`), save to the scratchpad: the current `/api/v1/spec.json` as `spec-before.json`, and the `/rpc` bodies of `market.summary`, `market.rates`, `market.marketListings` and `market.stats` (slug `atom02-heejin-348z`), `collections.rarity`, `collections.holders` (same slug), `pins.list`, `lockedObjekt.list` and `profile.preview` (address `0x4346c130732a50aecb97bf0c4e7f7588934d8913`), and `status.get`, each fetched without a session cookie; every file is non-empty JSON. The market reads used `binary02-joobin-301a`, the most-listed slug, since the first had no listings, and the profile reads added a public address with pins and locks and a private address with pins

## 2. Inputs

- [x] 2.1 Add `addressInputSchema` (`z.object({ address: addressSchema })`) to `schemas/common/address.ts`. Move the profile preview, pins and locked-objekts reads into `services/profile.ts`, `services/pins.ts` and `services/locked-objekts.ts`, keep `pins.list`, `lockedObjekt.list` and `profile.preview` on their bare-string input calling those services, and add `routers/profiles.ts` with the three `/api/v1` procedures taking `addressInputSchema`. `/rpc` still answers a bare string with the baseline body and an object with 400, as at HEAD, and `git diff HEAD -- apps/web` is empty; lint, typecheck and `bun run build --filter=web` pass for `@repo/api` and `web`
- [x] 2.2 Change `offset` and `limit` in `holdersInputSchema` and `marketListingsInputSchema` to `z.coerce.number<number>()` with the same `int`, `min`, `max` and default; the web callers still typecheck with numbers, and lint, typecheck and build pass for `@repo/api` and `web`

## 3. Output schemas

- [x] 3.1 In `schemas/market.ts`, add `marketSummaryOutputSchema` and `currencyRatesOutputSchema`. In `schemas/collections.ts`, add `collectionRarityOutputSchema`. Lint and typecheck pass for `@repo/api`
- [x] 3.2 In `schemas/profile.ts`, add `profilePreviewOutputSchema` and make `ProfilePreview` its `z.infer`. In `schemas/pins.ts`, add `pinsOutputSchema`. Create `schemas/locked-objekts.ts` with `lockedObjektsOutputSchema`, and `schemas/status.ts` with `statusOutputSchema`. Lint and typecheck pass for `@repo/api` and `web`

## 4. Routes

- [x] 4.1 Give the four market procedures their `.route()` (tag `Market`) and `.output(documented(...))`, with the paths in proposal.md; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 4.2 Do the same for `collections.rarity` and `collections.holders` (tag `Collections`), the three `profiles` procedures (tag `Profiles`), and `status.get` (tag `Status`); lint, typecheck and build pass for `@repo/api` and `web`
- [x] 4.3 Mount `market`, `collections` and `status` whole in `openApiRouter`, since each holds only public reads, and the new `profiles` router. A fresh `spec.json` lists twenty operations, each with a 200 schema naming its fields, and its first ten operations' paths, methods and parameters match `spec-before.json` (compare `paths` with response objects stripped)

## 5. Verification

- [x] 5.1 Fetch each new `/api/v1` operation for the samples in 1.1 without a session cookie: each body equals the saved `/rpc` body, apart from live counts and listings, which are checked by shape. `?offset=10&limit=5` on holders returns at most five rows, and `?limit=500` on listings returns 400. Recorded as read-only verified
- [x] 5.2 Find an address with a private profile through a read-only database query, and request its `/profiles/{address}`, `/pins` and `/locked-objekts` without a cookie: the preview is guarded with `counts` null, and pins and locks are `[]`. Nothing is created or changed
- [x] 5.3 With a browser on the dev server, open a profile (pins and locks render), hover a profile link (the hover card shows counts), and open an objekt's Holders and Trades tabs and `/market`: each renders with no errors in the console or the server log. `/api/v1/` shows the four tags with the new operations
- [x] 5.4 Run `bun run check`, `bun run build --filter=web` and `bunx oxfmt --check apps/web/src packages/api/src` from the root; all pass
