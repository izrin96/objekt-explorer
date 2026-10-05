## Why

`/api/v1` covers objekts, market, profiles and status, but not lists or the reference data
(artists and filter values) that a client needs to read the rest. Two list reads,
`listEntries` and `export`, also filter by an httpOnly cookie, so an API caller cannot
choose their artists, and the server's result depends on state the request does not show.

## What Changes

Six existing public reads join `/api/v1`, each as a `GET` with a documented response:

| Procedure | Route | Tag |
| --- | --- | --- |
| `list.findPublic` | `/lists/{slug}` | Lists |
| `list.listEntries` | `/lists/{slug}/entries` | Lists |
| `list.export` | `/lists/{slug}/export` | Lists |
| `list.profileLists` | `/profiles/{profileAddress}/lists` | Profiles |
| `config.getArtists` | `/artists` | Artists |
| `config.getFilterData` | `/filters` | Artists |

- `listEntries` and `export` stop reading the selected-artists cookie. Both take an
  optional `artist` list instead, as `/collections` and `/activity` do, and an omitted
  `artist` means every artist. The web app's list page and export dialog send the
  selected artists.
- `export` is documented as a `text/csv` download.
- Every input stays compatible over `/rpc`: the new `artist` field is optional. A tab
  opened before the deploy sends no `artist`, so its list shows every artist's entries
  until it reloads; nothing fails.
- `compare.compare` takes the same optional `artist` input, and the web app's compare
  query sends it, so `selectedArtistsMiddleware` is removed. `compare` stays off
  `/api/v1`.
- The selection itself still lives in the cookie. `config.setArtists` and
  `config.getSelectedArtists` are unchanged.

## Non-goals

- Publishing `compare.compare` or `list.listPreviews` under `/api/v1`.
- Changing what `findPublic` returns for a missing list (`null` with 200), or adding
  privacy rules the `/rpc` procedures do not have.
- Writes, login-only procedures, and the cookie and session procedures.
- Rate limiting or caching headers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: the public operation list grows from twenty to twenty-six, list entries
  and export take an explicit artist filter instead of a cookie, and the export is a CSV
  download.

## Impact

- `packages/api/src/routers/{list-crud,list-entries,list-utils,config,index}.ts`:
  `.route()`, `.output()`, the `artist` input, and the router entries. `listEntries` and
  `export` drop `selectedArtistsMiddleware`. `compare.ts` and `schemas/compare.ts`: the
  `artist` input. `orpc.ts`: the middleware is removed.
- `packages/api/src/schemas/`: new output schemas in `list.ts` (list entries) and a new
  `config.ts` (artists, filter data), and `listEntriesInputSchema`.
- `apps/web/src/features/list/{queries.ts,list-view.tsx,export-list-dialog.tsx}` and
  `features/compare/use-compare.ts`: pass the selected artists.
- The document and reference page gain the Lists and Artists tags and six operations. No
  dependency, data or environment changes.
