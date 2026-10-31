# Tasks

## 1. Server-only slug base in `@repo/api`

- [x] 1.1 Create `packages/api/src/lib/profile-slug.ts` exporting `profileSlugBase` (same body and comment as today) and move its three tests from `schemas/list.test.ts` to `lib/profile-slug.test.ts`; verify `bun test` in `packages/api` passes both files.
- [x] 1.2 Remove `profileSlugBase` and the `slugify` import from `schemas/list.ts`, and import it in `services/list.ts` from `../lib/profile-slug`; verify `rg slugify packages/api/src/schemas` finds nothing, and lint + typecheck + build pass for `@repo/api`.

## 2. `list.slugPreview` procedure

- [x] 2.1 Add `slugPreviewInputSchema` (`{ slug: z.string(), name: z.string().min(1).max(256) }`) and `slugPreviewOutputSchema` (`{ profileSlug: z.string() }`) to `schemas/list.ts`, with a test in `schemas/list.test.ts` that an empty or 257-character name is refused; verify `bun test` in `packages/api` passes.
- [x] 2.2 Add `slugPreview` to `listCrud` in `routers/list-crud.ts` as design.md lays out (rate limit `list-slug-preview` 60/60 s, `findOwnedList`, `list_profile_required` with no profile address, `generateProfileSlug(name, list.slug, list.profileAddress, list.id)`), not mounted in `openApiRouter`; verify lint + typecheck + build pass for `@repo/api` and `rg slugPreview packages/api/src/routers/index.ts` finds nothing.

## 3. Edit form URL field in `apps/web`

- [x] 3.1 Add `list_edit_url_on_save` ("Made from the name when you save") to `apps/web/messages/en.json`, `ko.json` and `ja.json`; verify `paraglide:compile` succeeds and the key exists in all three.
- [x] 3.2 In `list-draft.ts`, rename `ListUrl.fallbackSlug` to `listSlug` (and in `toListUrl`, `edit-list-dialog.tsx`) and replace `slugPreview` with `slugFieldValue(url, regenerate, preview)`; rewrite its tests in `list-draft.test.ts` (unticked shows the current slug, ticked shows the preview, ticked with none is empty) and remove the `slugify` import and Hangul test; verify `bun test` in `apps/web` passes.
- [x] 3.3 Add `useSlugPreview` and wire `ListUrlField` (`list-form-fields.tsx`): debounced name (300 ms, `useDebouncedCallback`), `orpc.list.slugPreview.queryOptions` with `enabled` only while ticked and the name is not blank, `placeholderData: keepPreviousData`, `retry: false`, the value from `slugFieldValue` and the placeholder `m.list_edit_url_on_save()`; verify lint + typecheck pass for `web`.
- [x] 3.4 Check it in the running app on a profile-bound list's edit dialog: unticked shows the current slug; ticked shows the hint, then the slug for the typed name; a name another list of that profile holds shows the `-2` slug; typing keeps the last slug until the new one arrives; the network panel shows one `list.slugPreview` call per pause, not per key. Leave Save unclicked (read-only verified; the preview itself writes nothing).
- [x] 3.5 Remove `slugify` from `apps/web/package.json` and run `bun install`; verify `rg slugify apps/web/src apps/web/package.json` finds nothing, `bun run knip` reports no unlisted `slugify`, and lint + typecheck + build pass for `web`.

## 4. Integration and docs

- [x] 4.1 Build `web` and confirm the client output carries no `slugify` code: `rg -l '"dollar"' apps/web/dist/client` (a key of slugify's char map, found in no source of ours) finds nothing, where the build before the change finds a chunk; verify `bun run check` passes at the root.
- [x] 4.2 In `packages/api/AGENTS.md`, add to the Lists section that `list.slugPreview` answers the edit form's URL field through the same `generateProfileSlug` as `list.edit`, so a change to how a slug is made lands in one place, and that `profileSlugBase` lives in `lib/profile-slug.ts` because a `schemas/` file must not import `slugify`; state that `apps/web/AGENTS.md` and the root `AGENTS.md` need no change; verify the sentences read in place.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
