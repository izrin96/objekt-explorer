## Context

See proposal.md for why. The composer (`features/trade/composer/`) is page state seeded once from the route's `ComposerStart`; anything set on the preview (rules, ratios, today's new want list) saves at once through the list page's own mutations, and only Post calls `trade.savePost`. Today:

- `settings.tsx` renders one `ListSelect` per side. `NewWantList` (inline name form, `useCreateList`) sits under the want dropdown only. A have or sale side with no list of its type shows "none of type" and a link to `/list`.
- `preview.tsx` renders `PickedSide` per picked list. It reads `listFindOptions(slug)` (type, `profileAddress`, currency) and `listEntriesOptions(slug)`, and opens one shared side sheet keyed by `SheetView` (`"rule"` or `"all"`).
- `CreateListDialog` (`features/list/create-list-dialog.tsx`) takes `initial: ListDraft` and, after a create Trade can take, swaps to a success step offering Post it. `ListForm` already has `ListTypeField locked` (used in edit mode).
- `useAddToList` takes `{ slug, skipDups, from, price?, isQyop?, note? }`, where `from` is `{ type: "objekts", tokenIds }` or `{ type: "collections", slugs }`, and its `onSuccess` invalidates `listEntries`, `list.find` and `trade.*` for the slug. That's what the preview reads, so the side refreshes on its own.
- Chat's `OwnedPicker` (`features/chat/attach/attach-owned-picker.tsx`) already draws a profile's holdings: `ownedCollectionOptions(address)` as an infinite query, `useLoadAllPages` while a filter is set, `PickerFilterBar` + `filterObjekts`, `VirtualCardGrid` of `ObjektCard`. The index uses `collectionOptions({ artist })` for every collection.

## Goals / Non-Goals

**Goals:**
- No server, schema or API change: everything goes through `list.create` and `list.addToList`.
- One new sheet component for both pickers. Their source and the request they send are the only differences.

**Non-Goals:**
- Changing `AddToListDialog`. It adds known objekts to a list the user picks; this does the reverse (known list, pick objekts), so it is not a fit.
- Sharing `usePickerSelection` from the offer builder. It carries offer-only counts, copies and limits.

## Decisions

### 1. New list is the dropdown's last item, opening a dialog

The pick comes from prototype variant B (branch `proto/composer-add-objekts`, `.claude/worktrees/composer-proto`): New list lives where the lists are, and the dropdown always renders, even with no list of that type. `ListSelect` gets one more `SelectItem` after the lists, value `NEW` (a sentinel like `NONE`), labelled New have list… / New sale list… / New want list…, with a top border. `onValueChange` catches `NEW`, opens the dialog and leaves the value unchanged. With `useUserProfiles()` empty, the have/sale item is `disabled` and a note under the dropdown links to `/account/profiles` (`m.link_link_cosmo()`, as `OwnedPicker`'s empty state). The "none of type" text and its `/list` link go.

One dialog per `ComposerSettings`, controlled by `newListSlot: Slot | null`:

- **Have and sale** reuse `CreateListDialog` with three new props, `lockType?: boolean`, `onCreated?: (slug: string) => void` and `finalFocus` (without it focus fell to `body` after Cancel; the want dialog takes it too, so both return to the dropdown). With `lockType`, `ListForm` gets `lockBind`, which renders `ListTypeField locked` (with `lockedHint` off, so the edit form's "fixed once created" hint stays out), hides the bind switch, and makes `ProfileField` `required`, dropping None, since None would unbind the list. With `onCreated`, a successful create calls it and closes instead of setting `created`, so no Post it step, and the description reads that the list is picked for the post. The composer opens it with `initial = { ...EMPTY_DRAFT, listType: slot, isProfileBind: true }`; the dialog already defaults `profileAddress` to the first profile.
- **Want** gets a small dialog holding today's `NewWantList` form body (one name field, the same `useCreateList` input: no profile, off Trade, not discoverable). The inline toggle button and its focus-return state go. `ListForm` would show the want list's extra fields (description, display profile), which the spec keeps out.

*Alternative:* `CreateListDialog` for want too. Rejected for the reason above. *Alternative:* extending `NewWantList` with profile and currency fields for have/sale. Rejected: it would duplicate `ListForm`'s fields and `listDraftSchema` validation.

### 2. Add objekts is a "+" tile and a bottom sheet in the preview's existing `Sheet`

`PickedSide` renders an Add objekts tile as the first `li` of `THUMB_GRID`: `TILE` with a dashed border and a `PlusIcon`, `aria-label` naming the list. Thumbnails before "+N" drop from 23 to 22 so the row length stays the same. The grid shows even when the list is empty, so the tile is the empty state's call to action; the "no objekts yet" line goes for picked sides.

`SheetView` gains `{ view: "add"; slug; name }`. The preview's one `Sheet` opens it with `side="bottom"` and a fixed height (`h-[88dvh]`, and `calc(100dvh - spacing 12)` below `sm`, where 88dvh left a sale list one row of grid; `h-full` collapses the popup), and keeps `side="right"` for the rule and all views. Reusing it keeps the one focus-return path (`opener`) and the close animation the preview already handles.

*Alternative:* a dialog per side. Rejected: two overlay systems on one page.

### 3. One `AddObjektsSheet` component, two sources

New `composer/add-objekts.tsx`:

- **Source.** `profileAddress !== null` (have, sale) → `useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false })` + `useLoadAllPages(filtering, query)`, as `OwnedPicker` does. Every row is an owned token (`ownedByOutputSchema`: `ownedObjektSchema[]`), so the rows are keyed by token `id`, sent as `{ type: "objekts", tokenIds }`. Want → `useQuery({ ...collectionOptions({ artist: selectedArtistIds }), throwOnError: false })` with `useCosmoArtist().selectedArtistIds`, as `useCollectionObjekts` does, so it shares the index's cache; the option's own `throwOnError: true` would take the whole page to its error boundary from a sheet. Keyed by `slug`, sent as `{ type: "collections", slugs }`. Filtering is `filterObjekts(toFilterSearch(filters), rows)` for both.
- **Layout.** Title and source line, the Edit post note, then `PickerFilterBar` across the full width. Below that, a grid `md:grid-cols-[minmax(0,1fr)_16rem]`: the `VirtualCardGrid` in a plain flex column (not `SheetPanel`, whose `ScrollArea` gives virtua no viewport; the offer picker avoids it the same way) and the tray as an `aside` with a start border. Below `md` the tray stacks under the grid.
- **Selection.** Local `Map<key, objekt>`, so the tray can draw what's ticked without looking rows up. `ObjektCard selected onToggleSelect`, and `onOpen` toggles too, so a tap on the card ticks it. The selection resets on each opening because the sheet content is keyed by `session`.
- **Tray.** "Ticked" with a count badge and Clear (always mounted, disabled at zero, so pressing it never drops focus), the ticked cards in a three-column grid that scrolls (below `md` a horizontal strip, `data-scroll-x`, so Cancel and Add stay on a phone's screen), each with an untick button. An untick first moves focus to the neighbouring untick button, else to the heading (`tabIndex={-1}`); Clear moves it to the heading, because the pressed control is about to unmount or disable. For a sale list, `PriceFields` with the list's currency. Cancel and Add N (disabled at zero, `loading` while pending) at its foot. When the stored list is on Trade (`discoverable && canBeOnTrade(listType, isProfileBind)`), the note above the filters says so. On a new post `rowBlock` keeps on-Trade lists out of the picks, so this is exactly a list in the post being edited; a list picked during the edit gets no note.
- **Submit.** `useAddToList().mutate({ slug, skipDups: true, from, ...price })`. On success, show the same toast the list page uses (`addedToast`) and close the sheet. On error, the hook's toast says why, and the sheet stays open with its ticks.

The grid and empty states reuse chat's `GridSkeleton` / `LoadError` / `EmptyState` pattern. Those parts move to a shared spot only if importing from `features/chat/attach/` reads wrong. Prefer importing them.

*Alternative:* extending `OwnedPicker` with a multi-select mode. Rejected: it is single-pick, builds an `Attachment`, and carries a profile switcher this sheet must not have (the list fixes the profile).

### 4. `skipDups: true`, no "already on list" marking

The server skips duplicates. Marking tiles would mean matching tokens and collections against `listEntries` in the browser. It is cheap to add later and not needed for the spec.

## Risks / Trade-offs

- [The want picker loads every collection of the viewer's selected artists, the same payload as the index] → It is the cached `collectionOptions` query the index already uses, so a visit to the index warms it, and `VirtualCardGrid` virtualises the grid. The spec scopes it to the viewer's selected artists, and `PickerFilterBar`'s artist facet draws from the same filter data, so it offers no artist outside that scope.
- [A big profile needs every page before filtering] → This is the same `useLoadAllPages` trade-off `OwnedPicker` already makes, and only while a filter is set.
- [On Edit post an add is live on Trade before Save] → The spec makes the sheet say so. Rules and ratios already behave this way.
- [`CreateListDialog` grows two flags] → Both are optional and default to today's behaviour. The list page's callers don't change.

## Migration Plan

Web-only and no data change. It deploys with the web image, and a revert rolls it back.
