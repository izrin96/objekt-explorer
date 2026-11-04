# Proposal

## Why

The composer already lets the viewer add objekts, rules and ratios to a picked list without leaving the page, but renaming a list or changing its description, currency or profile binding still means leaving the composer for the list page and losing the picks. A post is often where a trader notices the list's name or description is wrong.

## What Changes

- **Edit list from the preview.** Each picked side of the composer's preview offers an Edit list button beside the list's name. It opens the list page's edit form for that list.
- **Saves at once, keeps the picks.** Saving applies to the list straight away, as rules and ratios in the composer already do, and the composer keeps its kind, lists and options. A rename shows in the preview and the side's dropdown. Leaving the composer without posting keeps the edit.
- **No Trade line from the composer.** Opened from the composer, the edit form leaves out its Trade line (Edit post or Post it), since either would reopen the page the viewer is on and drop the picks.
- Closing the form returns focus to the Edit list button.
- The button's label ("Edit <list>") is translated (en, ko, ja).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: adds editing a picked list from the composer's preview.
- `web-lists`: the edit form's Trade line is left out when the form is opened from the composer.

## Non-goals

- Removing objekts from a list in the composer. The edit form has no such control, and the preview's thumbnails only set ratios.
- Changing a list's type or profile binding once set; the edit form keeps them fixed, as on the list page.
- Editing a list from the side's dropdown, or from Browse and the person pages.
- Any change to Post, Edit post or what `trade.savePost` saves.

## Routes

- `/trade/new` (New post and Edit post): the Edit list button on each picked side of the preview.

## Impact

- `apps/web/src/features/trade/composer/preview.tsx`: the button and the dialog on each picked side.
- `apps/web/src/features/list/edit-list-dialog.tsx`: optional `showTradeLine` and `finalFocus` props; every other caller is unchanged.
- `apps/web/messages/{en,ko,ja}.json`: `trade_composer_edit_list`.
- `apps/web/AGENTS.md`: the Post composer convention names the button and why the Trade line is hidden.
- No API, schema or server change: the form saves through the existing `list.edit` mutation.
