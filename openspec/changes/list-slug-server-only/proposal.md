# Proposal

## Why

The `slugify` library ships in the web client bundle. Two paths bring it in: the list edit form's URL field computes the regenerated slug in the browser through `profileSlugBase`, and `packages/api/src/schemas/list.ts` imports `slugify` at the top of a file the client imports for other things (`tradeSideOf`, `LIST_REFUSALS`, types). `slugify` is CommonJS, so the bundler keeps it even where nothing calls it. The browser's guess is also inexact: it never shows the `-2` suffix a taken slug gets.

## What Changes

- `profileSlugBase` moves out of `packages/api/src/schemas/list.ts` into a server-only pure module in `packages/api`, with its tests. `schemas/list.ts` no longer imports `slugify`.
- A new owner-only read, `list.slugPreview`, returns the profile slug that saving the list under a given name would give now, made the way `list.edit` makes it, `-<counter>` suffix included. It writes nothing.
- The list edit form's URL field (wherever the edit dialog opens for a list filed under a profile: `/list`, a profile's Lists tab, the list page) asks `list.slugPreview` while Regenerate URL from new name is ticked, as the name is typed, and shows the answer. Until the first answer, or when the read fails, it says the URL will be made from the name on save. Unticked, it shows the current slug as today.
- `apps/web` drops `slugify` from its dependencies, and no web module imports it.

## Non-goals

- No change to how the server builds a slug on save, the 90-character cut, the `-<counter>` suffix, or the fallback to the plain list slug.
- No promise that the preview holds: another list can take the slug before the save, and the save then picks the next free one.
- No change to the create or copy forms, which show no URL field.
- No change to `slugifyObjekt` in `@repo/lib`, which does not use the `slugify` library.
- `list.slugPreview` is not mounted on `/api/v1`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: the edit form's URL field, before and after Regenerate URL from new name is ticked, is added as its own requirement.

## Impact

- `packages/api`: `schemas/list.ts` (drops `profileSlugBase`, gains the preview's input and output schemas), `schemas/list.test.ts`, `services/list.ts`, `routers/list-crud.ts` (the new procedure), and a new `src/lib/profile-slug.ts` with its test.
- `apps/web`: `features/list/list-draft.ts`, `list-draft.test.ts`, `list-form-fields.tsx`, `edit-list-dialog.tsx`, and one new message in `messages/{en,ko,ja}.json`.
- `apps/web/package.json` and `bun.lock` lose `slugify` for `web`; `packages/api` keeps it.
- The web client bundle no longer carries `slugify`. The edit form makes a few debounced requests while the box is ticked and the name changes.
