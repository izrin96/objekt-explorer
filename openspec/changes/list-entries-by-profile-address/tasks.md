# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=@repo/api` or `--filter=web`). Tasks 1.1 and 2.1 shipped in commit `e24c5f57`, checked then with `bun run check`. `@repo/api` has no build task; `bun run build --filter=web` passed on 2026-11-12.

## 1. API

- [x] 1.1 Add the optional `address` to `listEntriesInputSchema`, make `fetchListWithEntries` take the list lookup, and pass `{ profileSlug, profileAddress }` from the `listEntries` handler when `address` is set. Checked locally: four lists return byte-identical bodies by slug and by profile slug with address; an unknown profile slug is 404; `address=xyz` is 400.
- [x] 1.2 `/api/v1/spec.json` lists `address` on `GET /lists/{slug}/entries` with its description: the shipped schema carried it as a comment only, so it moved to `.meta({ description })`. With `address`, `?artist=idntt` returns the list's 22 idntt entries and `?artist=artms` returns none, each equal to the read by slug. The local list holds one artist, so a mixed-artist list is unchecked.

## 2. Web

- [x] 2.1 `listEntriesUrl` takes the address (tested), `profileListEntries` reads by it, `startListReads` takes `scoped` and files the early read under the list's own slug, and the profile-scoped route passes it. Checked locally, signed out, clicking from a profile's Lists tab: the entries and the list read start together, one entries request, the grid draws; the same list again makes no request.
- [x] 2.2 Checked locally on `/@$nickname/list/$slug`, signed out, on client navigation: three want lists with rules draw their entries from one early request and their rules after the list; Compare mode makes no entries request; with the `?address=` request blocked the page asks by slug and draws. Against the old loader on the same lists: the entries start with the list read instead of after it, and dev's aborted-then-repeated entries request is gone. One run logged React's "called use() to suspend in a previous render" once; eight later runs, four on each loader, did not.

## 3. Close

- [ ] 3.1 If `slim-list-entries` lands first, carry `address` through `listEntryRows` and its loader; if this lands first, note it in that change's task 5.1.
- [ ] 3.2 `AGENTS.md`: none changed. `apps/web/AGENTS.md` already carries the loader round-trip rule (commit `8e5c357c`).
