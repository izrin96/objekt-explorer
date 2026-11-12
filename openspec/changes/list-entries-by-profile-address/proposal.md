# Proposal

## Why

A list filed under a Cosmo lives at `/@$nickname/list/$slug`, where `$slug` is its profile slug. The entries endpoint takes only the list's own slug, so on a client navigation the browser had to wait for the list read to learn that slug before it could ask for the entries, the largest download on the page. The list read itself already accepts the profile slug with the address; the entries read should accept the same pair, so both start together.

This change records behaviour that shipped in commit `e24c5f57` without a spec. The code is in place; the spec delta and the open checks are what remain.

## What Changes

- `list.listEntries` (`GET /api/v1/lists/{slug}/entries`) takes an optional `address` query parameter. With it, `{slug}` is the list's profile slug under that Cosmo address. Without it, nothing changes.
- The response is the one the list's own slug returns: same entries, same order, same `artist` filter, same serial hiding.
- An `address` that is not a valid address is 400. A profile slug the address does not hold is 404.
- On `/@$nickname/list/$slug`, the loader asks for the entries by profile slug and address while the list loads, then files them under the list's own slug, so the page's query key and every slug-keyed invalidation stay as they were. A list already in the browser's cache skips this read. If the read fails, the page asks by slug as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: a new requirement defines the entries read by profile slug and address.

## Impact

- **Routes:** `/@$nickname/list/$slug` (client navigation only); API `GET /api/v1/lists/{slug}/entries` and `/rpc` `list.listEntries`. `/list/$slug` and the first document load of either route are unchanged: the server already knows the slug when it writes the preload link.
- **API:** `packages/api/src/schemas/list.ts` (`listEntriesInputSchema`), `routers/list-entries.ts`, `services/list/read.ts` (`fetchListWithEntries` takes the list lookup); `services/compare.ts` and `services/list/export.ts` pass `{ slug }`.
- **Web:** `features/list/list-entries-url.ts` (+ test), `features/list/queries.ts` (`profileListEntries`), `features/list/list-route.ts` (`startListReads` takes `scoped`), `routes/(container)/@{$nickname}_/list.$slug.tsx`.
- **Open change `slim-list-entries`:** its `listEntryRows` reuses `listEntriesInputSchema`, so it inherits `address` in its input and needs to pass it to the lookup, and its loader task (5.1) replaces the read this change starts early. Whichever lands second carries the other over.

## Non-goals

- Changing the entries response, its order or its `artist` filter.
- Accepting `address` on `/lists/{slug}/export`, `/lists/{slug}/rules` or `/lists/{slug}/rules/{ruleId}/objekts`.
- Starting a want list's rules earlier: they ask the indexer and stay a browser read after the list.
- Changing the first document load, where the preload link already names the list's own slug.
