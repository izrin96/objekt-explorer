## Context

See proposal.md. Available on `web/main`: `useUserLists` / `useUserProfiles`,
`ObjektCardMenu({ children })` wrapper, `SelectBar({ visibleIds, children, secondary })`,
`useSelection`, `ObjektVirtualGrid({ columns? })`, `ObjektDrawer`, `filterSearchSchema`,
`FilterBar`, `lib/form.ts` (`zodErrors`), `isSafeRedirect`, `validColumns`. The lab has
`ListForm` (265 lines), `ListView`, `ListHeader`, compare button/dialog/banner with
`compareSearchSchema` and a client-side `performComparison`; the website has the same
surfaces over ORPC with heavy intentui use (create/edit list modals 10 imports each).

## Goals / Non-Goals

**Goals:** lists on the website's procedures with the lab's UI; the objekt grid's action
slots finally filled; compare on the URL.

**Non-Goals:** trade partners; wiring Add to list into surfaces other slices are building now.

## Decisions

**1. Folders.** `features/list/{queries.ts,actions.ts,list-card.tsx,list-form.tsx,create-list-dialog.tsx,edit-list-dialog.tsx,delete-list-dialog.tsx,list-header.tsx,list-view.tsx,add-to-list-dialog.tsx,add-to-list-menu-item.tsx,set-price-dialog.tsx,remove-from-list-dialog.tsx,export-button.tsx,profile-lists.tsx,list-provider.tsx}`,
`features/compare/{search-schema.ts,use-compare.ts,compare-button.tsx,compare-dialog.tsx,compare-banner.tsx}`,
`features/discord/{format.ts,discord-format-dialog.tsx}`, `lib/functions/list.ts`.

**2. Form.** `ListForm` stays the lab's component, on Base UI `Form` + zod as C7 chose;
its schema is `list.create`'s input shape (`listTypeNew`, `isProfileBind`, `profileAddress`,
`linkedListId`, `currency` required when `sale`, `discoverable` ⇄ the lab's `isPublic`).
`normalizeList` / `isListValid` from the lab are replaced by the zod schema. Edit reuses
the form with `list.find` data and `list.edit` (adds `gridColumns` from `validColumns`).

**3. Data.** `queries.ts`: `listBySlugQuery({ slug, address? })` (`staleTime: 0`, as the
website, so the loader always refetches), `listEntriesOptions(slug)`, `profileListsOptions(address)`.
`actions.ts`: mutations for `create`, `edit`, `delete`, `addObjektsToList`,
`removeObjektsFromList`, `updateEntryPrices`; each invalidates `currentUserOptions` and the
list's queries. `lib/functions/list.ts` = website `getListBySlug` with `notFound()`.

**4. Routes.** `(container)/list/index.tsx`: `beforeLoad` requires a session (redirect with
`redirect: location.href`). `(container)/list/$slug.tsx`: `beforeLoad` fetches the list;
`profileAddress && profileSlug` → `notFound()` when `!list.profile`, else `redirect` to
`/@{$nickname}/list/$slug` with `nickname = profile.nickname ?? address.toLowerCase()` and
`slug = profileSlug`. `(container)/@{$nickname}_/list.$slug.tsx`: loader resolves profile
then `listBySlugQuery({ slug, address })`, `validateSearch: filterSearchSchema.merge(compareSearchSchema)`,
`ProfileProvider` (C5's) + `ListProvider`. `@{$nickname}/list.tsx` replaces C5's placeholder
body with `profile-lists.tsx` on `profileListsOptions`. The plain `/list/$slug` also carries
`validateSearch` so unbound lists compare too.

**5. Add to list.** `add-to-list-menu-item.tsx` exports `AddToListMenuItem({ objektIds })`
(a `MenuItem` for `ObjektCardMenu`) and `AddToListAction` (a `SelectBarAction`); both open
`AddToListDialog` over `useUserLists`, `addObjektsToList({ skipDups: true })`, toast with
the skipped count. `(container)/index.tsx` renders them when a session exists. Market and
profile get the same two lines in a follow-up after the merge.

**6. Compare.** `compareSearchSchema` is the lab's (`cmp_type`, `cmp_to`, `cmp_mode`);
`use-compare.ts` reads it through `useFilters` and writes through `useSetFilters`, clearing
all three at once; results from `orpc.compare.compare` (`sourceId = list slug`,
`targetType`, `mode`, `targetProfile` or `targetListId`), rendered by `ListView` in place
of entries while `isComparing`. The lab's client-side `performComparison` is not ported.
Owner actions stay visible while comparing (website behaviour; user decision in
`design/web-migration-plan.md` § 5).

**7. Discord format.** `format.ts` = website `discord-format-utils.ts` (pure); the dialog
is the website's options (group by none / season / season-first, default / compact style)
in Base UI, choosing Have and Want lists from `useUserLists`; output copied through
`CopyButton`. Placed under `features/discord` because three surfaces open it.

**8. Set price.** The lab's `SetPriceDialog({ count, currency, onSave })` extended with
QYOP and note per `updateEntryPrices`'s `{ entryId, price | null, isQyop, note? }`;
`ListView` maps selected objekt ids to entry ids.

## Risks / Trade-offs

- [Two slices touch `@{$nickname}/list.tsx`] → C5 writes a placeholder, C6 the body; the
  coordinator takes C6's file at merge.
- [Production data: create/edit/delete/add/remove/price are all writes] → verified up to
  the request boundary unless the user approves a write on a throwaway list; reads (`/list`
  with the user's real lists, list detail, export, compare) are verified for real.
- [Export download in the browser tooling] → verify the response headers and CSV body with
  `curl` against `/rpc/list/export`.
- [`staleTime: 0` on the list loader refetches on every navigation] → same as the website;
  entries are the heavy query and keep their own staleness.

## Migration Plan

Additive; nothing deploys.
