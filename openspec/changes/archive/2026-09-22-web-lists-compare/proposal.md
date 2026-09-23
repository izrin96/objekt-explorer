## Why

Lists are the site's trading tool and the last placeholder in the nav. They also own the
actions the objekt grid has been holding slots for since C3: Add to list on cards and in
the selection bar, Set price on sale lists, Discord format. Landing them in parallel with
market (C4) and profile (C5) completes the feature set before cutover.

## What Changes

- **Lists index** `/list`: signed-in only (redirect to `/login?redirect=/list`); the lab's
  `ListCard` grid from `currentUser.lists` with type badge, linked-list chip and the owner
  chip keyed on `profileAddress`; Create, Edit, Delete dialogs on `list.create` / `edit` / `delete`.
- **List form**: the lab's `ListForm` (name, type, currency for sale lists, description,
  linked Have/Want list, Cosmo profile binding with `isProfileBind`, public flag) as a
  Base UI form with zod, matching `list.create`'s input.
- **List detail**: `/list/$slug` resolves through a copied `getListBySlug` server function
  and redirects to `/@{$nickname}/list/$slug` when the list is bound to a profile, as the
  website does; the profile-scoped route renders the same `ListHeader` + `ListView` on
  `list.listEntries`, with the list's `gridColumns`, owner actions Remove and Set price
  (`removeObjektsFromList`, `updateEntryPrices` with QYOP and note), Export (CSV from
  `list.export`), share link copy, Discord format.
- **Add to list**: `AddToListDialog` on `list.addObjektsToList` (skip duplicates, report
  skipped), exposed as a card menu item and a selection-bar action, wired on `/`.
- **Compare**: the lab's button, dialog and banner on the URL (`cmp_type`, `cmp_to`,
  `cmp_mode`) through `list-detail`'s `validateSearch`, results from `compare.compare`.
  While comparing, list edits stay enabled (the website's behaviour; the lab's hiding is
  not ported).
- **Discord format**: the website's `generate-discord` dialog and client formatter,
  reachable from the list header, the profile header and the account menu.
- **Profile Lists tab**: `orpc.list.profileLists` rendering lists bound to the profile,
  replacing C5's placeholder route body.
- `UserMenu` gains the My lists submenu (lists, Create list, Discord format, All lists).

## Non-goals

- No trade-partner matching (`findTradePartners`); it is not in the lab and is deferred
  to a follow-up decision.
- No wiring of Add to list into `/market` and the profile collection: both are being
  built in parallel; a one-file follow-up after the merge adds the menu item to each.
- No change to `@repo/api`, `apps/website`, `apps/lab`.

## Surfaces covered

`apps/web` routes `/list`, `/list/$slug`, `/@{$nickname}/list/$slug`, `/@{$nickname}/list`,
the card menu and selection bar on `/`, the account menu. Lab: `routes/{lists,list-detail}.tsx`,
`components/list/*`, `components/compare/*`, `add-to-list-dialog.tsx`, `components/profile/{lists-view,set-price-dialog}.tsx`,
`store/{lists,lists-seed}.ts`. Website: `components/list/**`, `components/compare/**`,
`components/shared/generate-discord-button.tsx`, `components/profile/profile-list.tsx`,
`hooks/{use-list-objekt,use-list-target,use-compare-filters}.ts*`, `hooks/actions/{add-to-list,remove-from-list,update-entry-prices}.ts`,
`lib/{functions/list,queries/list,discord-format-utils}.ts`, `routes/(container)/{list/index,list/$slug,@{$nickname}_/list.$slug}.tsx`,
`routes/@{$nickname}/list.tsx`.

## Capabilities

### New Capabilities

- `web-lists`: creating, editing, deleting and viewing lists; adding, removing and pricing entries; export, share and Discord format.
- `web-compare`: comparing a list against a profile or another list on the URL.

### Modified Capabilities

- `web-shell`: the account menu gains the My lists submenu (delta below).

## Impact

- No new dependencies.
- ~28 new files under `features/{list,compare,discord}`, `lib/functions/list.ts`, four
  routes (one replacing the `list.tsx` placeholder, one replacing C5's `@{$nickname}/list.tsx`
  placeholder); `components/layout/user-menu.tsx`, `routes/(container)/index.tsx` and
  `features/profile/profile-header.tsx` (Discord button) edited.
