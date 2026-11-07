# Proposal

## Why

The Attach objekt picker in a conversation was a 48rem dialog with two tabs, My objekts and My lists, each holding its own source dropdown (Profile, List) under the tab strip. The tabs and the dropdown said "where from" twice, the tab strip took a row from a small grid, and the picker looked and sized unlike New post's Add objekts drawer, the other place a user picks their own objekts.

## What Changes

- Attach objekt opens as a bottom drawer sized like New post's Add objekts: the full width, 88% of the viewport's height, and on a phone all but the top gap. The description stays for screen readers and is hidden below `md`.
- The two tabs go. One source control at the start of the filters lists the user's linked Cosmo profiles under "My objekts" and their lists under "My lists", each list after its list type badge. Its trigger reads "Profile · <name>" or "List · <name>".
- The source control shows even for a user with one linked profile, since it now also holds the lists.
- The filters stay set when the user switches source.
- The cards use the same width target as New post's grid, so the drawer shows the same card size.
- With no linked profile and no lists, the drawer shows the Link a Cosmo profile empty state. The separate "You have no lists yet" state, and its message in every locale, are removed.

Route: `/messages/$id` (the thread's message box). The Attach objekt picker opened by "Pick objekts instead" on an attached post card is the same picker.

## Non-goals

- Ticking several objekts or attaching more than one card to a message: a pick still attaches one card and closes the drawer.
- A tray of ticked cards, as New post's drawer has.
- Suggesting objekts from the partner's lists.
- Changing the offer pickers or New post's drawer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: the Thread view requirement's paragraph on Attach objekt changes from two pickers with their own sources to one drawer with one grouped source control.

## Impact

- `apps/web/src/features/chat/attach/`: the dialog becomes a sheet; the two pickers fold into one, and their grids remain (`attach-owned-grid.tsx`, `attach-list-grid.tsx`).
- `apps/web/src/features/filters/single-select.tsx`: options may carry a group heading, drawn as a labelled group. Existing callers pass no group and render as before.
- `apps/web/messages/{en,ko,ja}.json`: `chat_attach_no_lists` removed; the other attach strings are reused (the old tab labels become the group headings).
- No API, schema or server change.
