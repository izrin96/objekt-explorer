# Design

## Context

`profileSlugBase(name)` in `packages/api/src/schemas/list.ts` wraps `slugify(name, { lower: true, strict: true })`, cuts it to 90 characters and trims a trailing dash. `generateProfileSlug(name, listSlug, address, excludeListId)` in `services/list.ts` takes that base, falls back to the plain list slug when it is empty, and adds `-2`, `-3`… until no other list of that address holds it. `list.edit` (`routers/list-crud.ts`) calls it when Regenerate is ticked or the list moved profile. In the web, `slugPreview` (`features/list/list-draft.ts`) calls `profileSlugBase` for the read-only List URL input in `ListUrlField` (`list-form-fields.tsx`); `ListUrl` carries `nickname`, `profileSlug` and `fallbackSlug` (the plain list slug), filled by `toListUrl` in `edit-list-dialog.tsx`. `apps/web/vite.config.ts` already refuses a client import of `packages/api/src` outside `schemas/` and `constants.ts`. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- No module the web client loads imports `slugify`, directly or through `@repo/api/schemas/*`.
- The URL field shows the slug a save would give, from the same code the save runs.

**Non-Goals:**
- Keeping `slugify` out of `@repo/api` itself; the server keeps it.
- Reserving the previewed slug until save.

## Decisions

**`profileSlugBase` moves to `packages/api/src/lib/profile-slug.ts`, with its tests moved to `lib/profile-slug.test.ts`.** The package keeps pure logic in `src/lib/` beside its test, and the Vite rule above keeps the client out of `lib/`. `services/` was the first idea, but `services/list.ts` imports the database, so tests there could not run under the pure-modules rule.

**A new procedure, `list.slugPreview`, beside `list.edit` in `routers/list-crud.ts`.** Input `slugPreviewInputSchema` = `{ slug, name }`, with `name` held to `editListInputSchema`'s rule (`min(1).max(256)`); output `{ profileSlug }`. Both schemas live in `schemas/list.ts` beside the edit input. The handler:
1. `refuseOverUserLimit("list-slug-preview", user.id, 60, 60)`: a ticked box typing a long name stays well under it with the debounce below.
2. `findOwnedList(slug, user.id)`, so another user's list is `NOT_FOUND`, as `list.edit` answers.
3. A list with no `profileAddress` is refused with the existing `list_profile_required`; the web never asks for one, since it shows no URL field there.
4. Returns `generateProfileSlug(name, list.slug, list.profileAddress, list.id)`, the call `list.edit` makes, on the pool, read-only.

It is a new procedure, so no open tab sends it an old shape. It is not mounted in `openApiRouter`: it is an owner read. No new refusal code, so no new `api_errors_*` string. Alternative: a `dryRun` flag on `list.edit`. Rejected: a write procedure with a no-write mode is easy to break, and its rate limit and invalidations are a write's.

**The preview follows the stored profile address.** When the owner of an unbound list picks another profile in the form, the field still shows the stored profile's URL, as it does today; the save makes the slug under the new address. Showing the new profile's URL is out of scope.

**Web: one hook and one pure function, both in `features/list/`.**
- `ListUrl.fallbackSlug` is renamed `listSlug`: the preview reads it as the procedure's `slug`, and nothing else reads it once the client stops computing a fallback.
- `slugFieldValue(url, regenerate, preview)` replaces `slugPreview` in `list-draft.ts`: unticked → `url.profileSlug`; ticked → `preview ?? ""`. Tested in `list-draft.test.ts`.
- `useSlugPreview(url, name, regenerate)` in `ListUrlField`'s file follows `useUserSearch` (`features/user/user-search.tsx`): the typed name goes through `useDebouncedCallback` (300 ms) into state, and `useQuery(orpc.list.slugPreview.queryOptions({ input: { slug: url.listSlug, name }, enabled: regenerate && name.trim() !== "", placeholderData: keepPreviousData, staleTime: 0, retry: false }))`. It returns `data?.profileSlug` only while ticked and not errored. `keepPreviousData` keeps the last slug in the box while a new name is fetched, so the field does not flash empty between keystrokes. `staleTime: 0` overrides the app's 5-minute default, as `copyPreview` does: editing or deleting another list takes or frees a slug and invalidates only that list's queries, so a cached answer is shown at once and then checked again.
- `ListUrlField` sets the input's `value` from `slugFieldValue` and its `placeholder` to `m.list_edit_url_on_save()` ("Made from the name when you save"). An empty value shows the placeholder, so the first load and a failure need no branch of their own. The `Input` stays, so `Label htmlFor` keeps pointing at a form control.

Alternatives:
- A placeholder only, no preview: least code, but the owner sees no URL before saving. Rejected after review.
- A hand-written slug function in the client: drifts from `slugify`'s char map on Hangul and accented names, and cannot see the suffix. Rejected.

**`apps/web/package.json` drops `slugify`;** `bun install` updates `bun.lock`. The Hangul test in `list-draft.test.ts` goes; `lib/profile-slug.test.ts` keeps the server's cases.

## Risks / Trade-offs

- [The previewed slug is taken before the save] → The save runs `generateProfileSlug` again and takes the next free slug; the list opens at its real address. Rare, since slugs are per profile.
- [Requests while typing] → Only while the box is ticked, debounced 300 ms, rate-limited per user; a name asked before shows its cached answer while it is asked again. Each is one indexed lookup per candidate slug on `(profile_address, profile_slug)`.
- [A refusal or failure hides the preview] → The field falls back to the on-save hint; saving is unaffected.
- [A web module could import `slugify` again later] → `knip` reports an import of a package missing from `apps/web/package.json`, and no `@repo/api/schemas/*` file imports it after the move.
- [An open tab from before the deploy] → It still computes the preview with its old bundle and never calls `list.slugPreview`; `list.edit` is unchanged, so its save works as before.

## Migration Plan

Server and web ship in the same deploy; no data change. The new procedure exists before any client calls it. Rollback is a revert.
