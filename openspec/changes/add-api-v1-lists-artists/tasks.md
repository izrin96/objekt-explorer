## 1. Baseline and spike

- [x] 1.1 With a read-only database query, pick a public list holding objekts of more than one artist and a profile with lists. With a dev server (`vite dev --port 3100`), save to the scratchpad `/api/v1/spec.json` as `spec-before.json`, and the `/rpc` bodies of `list.findPublic`, `list.listEntries`, `list.profileLists`, `config.getArtists` and `config.getFilterData`, plus the `list.export` CSV, each fetched once with no cookie and once with an `artists` cookie naming one artist; every file is non-empty
- [x] 1.2 Spike the CSV response: in a scratch procedure, give `.output()` a `z.file().mime("text/csv")` schema, and separately a `documented()` registry entry with `contentMediaType: "text/csv"`, generate the document, and record which one gives the 200 response a `text/csv` content type with no JSON schema. Note the outcome in design.md and delete the scratch code

## 2. Artist input

- [x] 2.1 Add `listEntriesInputSchema` to `schemas/list.ts`. Switch `list.listEntries` and `list.export` to it, pass `input.artist` to `buildListEntries`, and remove `selectedArtistsMiddleware` from both; `compare.compare` keeps it. Lint and typecheck pass for `@repo/api`
- [x] 2.2 In the web app, make `listEntriesOptions` take the artist list, pass `selectedArtistIds` from `useCosmoArtist()` in `list-view.tsx`, and send `{ slug, artist }` from the export dialog. Confirm that `useListInvalidation`'s `orpc.list.listEntries.key({ input: { slug } })` still matches a key carrying `artist`, by reading the query cache in the browser or the TanStack Query matching code. Lint, typecheck and `bun run build --filter=web` pass for `@repo/api` and `web`

- [x] 2.3 Give `compareInputSchema` the same optional `artist` field, pass it in `compare.compare` instead of the middleware's `artists`, send `selectedArtistIds` from `useCompareQuery`, and delete `selectedArtistsMiddleware` from `orpc.ts`; `grep -rn selectedArtistsMiddleware packages apps/web/src` finds nothing. Lint and typecheck pass for `@repo/api` and `web`

## 3. Output schemas

- [x] 3.1 In `schemas/list.ts`, add `listObjektSchema` (with `satisfies z.ZodType<ListObjekt>`), `listEntriesOutputSchema`, `findPublicOutputSchema` and `profileListsOutputSchema`. Create `schemas/config.ts` with `artistsOutputSchema` (with `satisfies` against `CosmoArtistWithMembersBFF`) and `filterDataOutputSchema`. Lint and typecheck pass for `@repo/api` and `web`

## 4. Routes

- [x] 4.1 Give `findPublic`, `listEntries` and `export` their `.route()` (tag `Lists`), `profileLists` its route (tag `Profiles`), and `getArtists` and `getFilterData` theirs (tag `Artists`), each with `.output(documented(...))`, using the CSV outcome of 1.2 for `export`. Pass Cosmo's artist body with `{ open: true }`. Lint, typecheck and build pass for `@repo/api` and `web`
- [x] 4.2 Add `list: { findPublic, listEntries, export, profileLists }` and `config: { getArtists, getFilterData }` to `openApiRouter`. A fresh `spec.json` lists twenty-six operations, each with a documented 200 response, the export as `text/csv`, and the existing twenty operations identical to `spec-before.json`

## 5. Verification

- [x] 5.1 Fetch the six new operations without a cookie: `findPublic`, `profileLists`, `getArtists` and `getFilterData` equal their saved `/rpc` bodies; entries and the export with no `artist` equal the no-cookie baseline; `?artist=<one artist>` equals the baseline taken with that artist's cookie; and the export's content type is `text/csv`. An unknown slug returns 404 for entries and export. Recorded as read-only verified
- [x] 5.2 Over `/rpc`, call `list.listEntries` and `compare.compare` with no `artist` and with an `artists` cookie: each result holds every artist, so the cookie is ignored and an old client still succeeds, and `compare.compare` with `artist` narrows its result
- [x] 5.3 With a browser on the dev server, open the sample list with one artist selected and then all: the entries, and a comparison against a profile, follow the selection, and the empty-state hint still shows when the selection hides every entry. Open the export dialog and confirm the request it would send carries `artist`, without downloading or changing anything. The console and server log show no errors
- [x] 5.4 Run the CI steps from the root: `bunx oxfmt --check`, `bun run lint`, `bun run typecheck` and `bun run --filter web build:prod`; all pass
