## Context

See proposal.md for why. The current state this design builds on:

- `features/list/copy-list-dialog.tsx`: `CopyListDialog({ slug })` loads the source with `listFindOptions` and mounts `CopyListForm`, which seeds its draft from `toCopyDraft(list)` and shows the `list.copyPreview` hint whenever `copyMode` is not `"rows"`. The form renders `ListForm` without `lockBind`, so the type stays editable.
- `features/list/actions.ts`: `useCopyList()` toasts, awaits `useListInvalidation()` and then always navigates to `/list/$slug`. `useCreateList()` does no navigation, and `CreateListDialog` takes `onCreated(slug)` + `finalFocus` for the composer.
- `features/trade/composer/settings.tsx`: `ListSelect` ends with the `NEW` item. `ComposerSettings` keeps `newList: { slot, open }` and the `newListOpener` ref, mounts one `CreateListDialog` with `lockType`, and passes `onCreated={(slug) => pick(slot, slug)}`.
- `useUserLists()` (`features/user/hooks.ts`) already holds every list the viewer owns, all four types, from the current-user read. `pickList` accepts a slug that is not in `lists` yet, and a fresh copy has no partner.
- `list.copy` takes `createListInput + sourceSlug`. It refuses only through the shared create/copy budget and the usual validation.

## Goals / Non-Goals

**Goals:** the composer and `/list` share one copy form and one draft rule; the composer flow mirrors New list (state shape, focus return, pick after invalidation).

**Non-Goals:** a new endpoint or query; a generic "pick then act" dialog for other features.

## Decisions

1. **The draft rule becomes a pure module.** `toCopyDraft` moves out of the dialog into `features/list/copy-draft.ts` as `toCopyDraft(list, { fixedType?, profiles })`, tested beside it. With `fixedType` set:
   - `listType` is the fixed type, and `isProfileBind` is `isBindable(type)`.
   - `profileAddress` is the source's when the viewer still has that profile, else the first profile, else null.
   - `currency` comes only from a sale source, else `""`.
   - `matchSale` / `matchHave` come only from a want source copied as want, else `EMPTY_DRAFT`'s.
   - Name, description, columns, hide serial, `linkedListId: null` and `ratio: null` stay as they are today.

   Without `fixedType` the result is the same as now, so `/list` behaves as before.
   *Alternative:* patching the draft inside the composer. That splits one rule across two features, and nothing would test it.
2. **`CopyListForm` is exported and gains two props.** `fixedType?: ListType` passes `lockBind` to `ListForm` and goes into `toCopyDraft`. `onCreated?: (slug) => void` replaces the navigation. `CopyListForm` draws no header: `CopyListDialog` draws its own once, above its loading switch, and the composer's dialog draws its own.
3. **`useCopyList({ opensCopy })`.** The hook toasts and awaits the invalidation, then navigates only when `opensCopy` (default true, so `/list` is unchanged). `CopyListForm` passes `opensCopy: false` when it has `onCreated`, and calls `onCreated` in `mutate`'s per-call `onSuccess` beside `onDone`. That runs after the hook's awaited `onSuccess`, so the invalidation has finished, and TanStack skips it once the form unmounts, so a dialog closed while the copy is in flight picks nothing.
   *Alternative:* calling `onCreated` from the hook's `onSuccess`. TanStack runs that even after the dialog is gone, so Cancel during a pending copy would still pick it.
4. **A composer-only dialog for the source picker.** `features/trade/composer/copy-list-dialog.tsx` exports `ComposerCopyDialog({ slot, open, onOpenChange, onCreated, finalFocus })`. Its `DialogPopup` holds, in this order:
   - its own `DialogHeader`: `list_copy_title`, with `list_create_picked_desc` as the description;
   - the Copy from `Select` over `useUserLists()`, each item showing the name and a `ListTypeBadge`, with the picked slug held in the dialog's state;
   - the body. When the source is loaded, it is `<CopyListForm key={slug} list fixedType={slot} onCreated>`. Before that, a panel shows a spinner while `listFindOptions(slug, true)` is pending, `refusalText` on error, or nothing when no source is picked yet, with a footer holding Cancel and a disabled Create.

   The `Select` sits outside the keyed subtree, so picking a source never remounts it and focus stays on it. The `key` remounts only the form, so a new source refills it (spec: Changing the source). Closing clears the picked source, as `CreateListDialog` clears its draft.
   *Alternative:* the `Select` inside `CopyListForm`'s panel. The remount on each pick would then drop focus from the control just used.
   *Alternative:* a `slug?` prop on `CopyListDialog`. That puts a picker branch inside the `/list` dialog that `/list` never uses.
5. **Dropdown wiring follows New list.**
   - `ListSelect` gets a `COPY = "__copy__"` item after `NEW`, labelled `trade_composer_copy_list` ("Copy a list…"), the same on every side, since the side already fixes the copy's type.
   - The item renders only when `useUserLists().length > 0`, and it is disabled under the same `needsProfile` as `NEW`.
   - `onValueChange` treats `COPY` as it treats `NEW`: open the dialog and leave the pick alone. Through a new `onCopy(trigger)` prop it sets `copyList: { slot, open }` in `ComposerSettings` and reuses the opener-ref pattern, so `finalFocus` returns focus to the dropdown.
   - `onCreated` calls `pick(copyList.slot, slug)`, which works on Edit post too, since `pick` already passes `replaces`.
   - `ListSelect`'s `onValueChange` ignores a change whose reason is `"none"` unless a key on its trigger caused it (a flag set in `onKeyDownCapture`, cleared on a timeout). Base UI's Select clears a value its items don't hold yet, and the pick lands before React renders the refetched lists, so without the guard the new list was picked and then cleared. Closed-trigger typing reports the same reason, hence the key check; checking whether `rows` holds the value does not work, since the reset runs in the render where the new row already exists. The guard covers New list too.
6. **Messages.**
   - `trade_composer_copy_list`: "Copy a list…". The label names no type: the source may be any type, and the side fixes the target's.
   - `trade_composer_copy_from`: "Copy from".
   - Every other string is reused: `list_copy_title`, `list_copy_name`, the hint messages, `list_create_picked_desc`, and `list_manage_objekt_list_placeholder` ("Select a list") for Copy from before a pick.
   - ko follows 합니다체. ja uses dictionary-form labels, and its 。 mirrors en.

## Risks / Trade-offs

- [Changing the source discards anything typed into the form] → intended (spec: Changing the source). The form is short, and keeping a hand-typed name across sources would be a second rule to explain.
- [A large source makes `list.find` slow before the form shows] → `/list` already uses the same read and the same spinner. The source picker itself needs no request.
- [A source whose profile the viewer has since unlinked] → `toCopyDraft` falls back to the first profile, and the server still checks ownership, so a mismatch is a refusal shown in the toast, never a wrong copy.
- [`useUserLists()` lags a list made in another tab] → the dropdowns read the same source, so the composer is already consistent with it. A refetch on focus catches up.

## Migration Plan

Web only: no migration, no API or schema change, and no deploy ordering. Rollback is reverting the commit.
