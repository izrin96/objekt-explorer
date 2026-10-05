## Context

`/api/v1` serves `openApiRouter` (`packages/api/src/routers/index.ts`) with
`documented()` outputs, as in the last two batches. The six procedures already serve
`/rpc`:

- `list.findPublic` (`list-crud.ts`) returns `PublicList | null`. `list.profileLists`
  (`list-entries.ts`) returns `PublicList[]`, or `[]` for a private profile the caller
  doesn't own.
- `list.listEntries` (`list-entries.ts`) and `list.export` (`list-utils.ts`) run
  `selectedArtistsMiddleware`, which parses the httpOnly `artists` cookie and passes it to
  `buildListEntries`. Both throw `NOT_FOUND` for an unknown slug. `export` returns a
  `File` (`text/csv`).
- `config.getArtists` returns Cosmo's `CosmoArtistWithMembersBFF[]` from cache, and
  `config.getFilterData` returns `{ collections, seasonsMap, classesMap }` built from
  arrays.

The web app reads the selection with `useCosmoArtist().selectedArtistIds`, which the
profile grid already sends as `artist` to `objekts.ownedBy`. An empty selection means
every artist, both there and in `buildListEntries`.

## Goals / Non-Goals

**Goals:**
- No `/rpc` input becomes stricter, so a client built before the deploy keeps working.
- The two list reads depend only on their request.

**Non-Goals:**
- No change to how the selection is stored, and no `/api/v1` route for `compare`.

## Decisions

**`artist` as an optional input field.** Add `listEntriesInputSchema =
listSlugInputSchema.extend({ artist: artistsArraySchema.default([]) })` to
`schemas/list.ts`, and use it for both procedures. Each handler passes `input.artist` to
`buildListEntries` and drops `selectedArtistsMiddleware`. It reuses the schema and the
parameter name `/collections` already has, including the repeated-key and case handling.
*Alternative:* fall back to the cookie when `artist` is omitted. That keeps an old tab's
filtering exact, but it keeps the hidden dependency these procedures are meant to lose.

**`compare.compare` follows.** Its input gains the same `artist` field, the handler
passes it to `buildListEntries` for the source list, and `useCompareQuery` sends
`selectedArtistIds`. With no procedure left using it, `selectedArtistsMiddleware` is
deleted from `orpc.ts`. `parseSelectedArtists` stays for `config.getSelectedArtists`.

**The web app sends the selection.** `listEntriesOptions(slug, artist)` takes
`selectedArtistIds` from `useCosmoArtist()` in `list-view.tsx`, and the export dialog
sends `{ slug, artist }`. The query key then includes the selection, so a change of
selection is a new key. `useListInvalidation` keeps
`orpc.list.listEntries.key({ input: { slug } })`, which is a partial key; the apply
checks that it still matches the keys that carry `artist`.

**Output schemas.**
- `schemas/list.ts`: `listObjektSchema` is a union of `ownedObjektSchema` and
  `indexedObjektSchema`, each extended with the entry fields (`entryId`, `price`,
  `isQyop`, `note`), with `satisfies z.ZodType<ListObjekt>`. Also add
  `listEntriesOutputSchema` (an array of it), `findPublicOutputSchema`
  (`publicListSchema.nullable()`) and `profileListsOutputSchema`.
- A new `schemas/config.ts`: `artistsOutputSchema` (the Cosmo artist with members and SNS
  links, `satisfies` against `CosmoArtistWithMembersBFF`, documented with
  `{ open: true }` like the other Cosmo pass-through bodies) and `filterDataOutputSchema`.
- `export` uses `.output(z.file().mime("text/csv"))`. The spike showed that this and a
  `documented()` registry entry with `contentMediaType` produce the same response:
  `content: { "text/csv": { schema: { type: "string", contentMediaType: "text/csv" } } }`.
  The plain schema needs no registry entry. It does validate at runtime, which the handler
  always passes, since it returns a `text/csv` `File`.

**Routes and router entries.** Lists go under the `Lists` tag. `profileLists` goes under
`Profiles` at `/profiles/{profileAddress}/lists`, keeping its existing field name, so
`/rpc` doesn't change. `/artists` and `/filters` go under `Artists`. `openApiRouter` picks
`list: { findPublic, listEntries, export, profileLists }` and
`config: { getArtists, getFilterData }`, because both routers also hold writes.

## Risks / Trade-offs

- [A tab opened before the deploy sends no `artist`, so a list shows every artist's
  entries] → It is a display difference that ends on reload. Nothing errors, and the
  export it downloads is complete rather than narrowed.
- [The `/rpc` output type of `listEntries` and `export` must not change] → `documented()`
  keeps the handler's own type. The baseline comparison checks the bodies.
- [Cosmo adds fields to the artist payload] → `{ open: true }` documents the listed fields
  without forbidding others.

## Migration Plan

Deploy as one release. There are no data or environment changes, and no `/rpc` input
becomes stricter. To roll back, revert the commit.
