# Design

## Context

The composer's side dropdowns call `onNew`, which sets `newList = { slot, open }` (`features/trade/composer/settings.tsx`). Two dialogs are mounted beside the dropdowns:

- `CreateListDialog` with `lockType`, open for have and sale. Its `initial` is `{ ...EMPTY_DRAFT, listType: bindSlot, isProfileBind: true }`, where `bindSlot` maps want to have so the dialog's draft always holds a type that binds, even while the want dialog is the open one.
- `NewWantListDialog`, open for want. It holds a name field and calls `useCreateList` directly.

`CreateListDialog` passes `lockType` to `ListForm` as `lockBind`. That locks `ListTypeField` and makes `ProfileField` `required`, so None isn't offered. The list form already handles a want list: `isBindable("want")` is false, so there's no binding switch, no Hide serial and no bind note, and `toCreateInput` sends `isProfileBind: false` for any type other than have or sale. The profile field reads "Show on profile". `CreateListDialog` defaults the profile to the viewer's first one for every type.

## Goals / Non-Goals

**Goals:**
- One create dialog for all three sides, using the list page's own form.

**Non-Goals:**
- Splitting `lockType` into separate type and binding locks.
- Any change to `ListForm` for the list page's own create or edit.

## Decisions

**Reuse `CreateListDialog` as it is, apart from one condition in `ListForm`.** In `ListForm`, `ProfileField`'s `required` becomes `lockBind && bindable`. With a have or sale type, nothing changes. With want, `lockBind` still locks the type, and the profile choice offers None because a want list never binds. The project rule is to prefer an existing component, and this one already covers want apart from that `required` flag.
- Alternative: separate `lockType` and `lockBind` props. Rejected because no caller needs one without the other, and for want the binding lock means nothing (`toCreateInput` drops it).

**The composer renders one dialog.** `initial` becomes `{ ...EMPTY_DRAFT, listType: newList.slot, isProfileBind: isBindable(newList.slot) }`, `open` is `newList.open`, and `onCreated` picks `newList.slot`. `bindSlot` and `NewWantListDialog` / `NewWantListForm` go. `CreateListDialog` resets its edited draft on every close, so a draft from one side never opens on another. The slot can't change while the dialog is open, because the dialog is modal.

**The profile defaults to the first one, as on the list page.** This follows from reusing the dialog unchanged, which is what "same across all" asks for. A viewer can still pick None.
- Alternative: open want on None, which keeps today's default. `CreateListDialog` falls back to the first profile whenever `initial.profileAddress` is null, so this would need a new prop. Rejected because it makes the composer and the list page differ.

**What a create sends doesn't change, apart from description and profile.** `NewWantListForm` sent `discoverable: false` and no Open to flags. `toCreateInput` sends no `discoverable` (the server defaults it to false) and `EMPTY_DRAFT`'s `matchSale: true, matchHave: true`, which equal the server's defaults. Either way the post's Save sets Trade state and Open to.

## Risks / Trade-offs

- [A want list made while posting now shows in the first profile's Lists tab by default, where before it was filed under none] → It matches what the list page does, and None is one pick away. The proposal names it as the visible change.
- [The first profile is the most recently linked one, and a post is headed by its lists' profile before the default one, so a Buy post with such a list is now headed by that profile, not the default] → A want list made on the list page already does this, and picking the default profile or None in the form keeps the default heading. The proposal names it too.
- [The want dialog grows from one field to four (type, name, description, profile)] → It's the cost of one form for all sides, and only the name is required.
- [Empty name: Create is no longer disabled; it shows "Name is required." on submit] → Same as have, sale and the list page.
