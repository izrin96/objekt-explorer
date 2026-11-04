# Tasks

The code for groups 1 and 2 is already in the working tree; each task is ticked once its verification passes.

## 1. Edit form

- [x] 1.1 In `EditListDialog` (`features/list/edit-list-dialog.tsx`), add optional `showTradeLine` (default `true`), passed to `EditListForm`, which renders `TradeLine` only when it is set, and optional `finalFocus`, passed to `DialogPopup`. Verify that every existing caller (`list-header.tsx`) passes neither, so the list page still shows the Trade line. Lint, typecheck and build `web`.

## 2. Composer

- [x] 2.1 Load `vercel-react-best-practices`. In `PickedSide` (`features/trade/composer/preview.tsx`), put the side's `SideHeading` and an `icon-xs` ghost `Button` with `PencilSimpleIcon` in one row, the button outside the `h3`, labelled and titled `m.trade_composer_edit_list({ list: name })`; render `EditListDialog` for the side's slug with `showTradeLine={false}` and `finalFocus` on the button's ref. Add `trade_composer_edit_list` in en ("Edit {list}"), ko ("{list} 편집") and ja ("{list}を編集"). Lint, typecheck and build `web`.
- [x] 2.2 Verify on local at 390 px and at desktop width, in a tab of its own on the automation Chrome, against the `web-trade-browse` "Edit list in the composer" scenarios: the button sits beside the name without overflow and the heading row looks even beside an empty side; a rename shows in the preview and the dropdown with the picks unchanged; the form has no Trade line; Cancel and Escape return focus to the button. Saving a rename writes, so do it only on the local database; against production verify up to the `list.edit` request ("read-only verified").

## 3. Docs

- [x] 3.1 In `apps/web/AGENTS.md` "Post composer", name the pencil, `showTradeLine={false}` and why, and list "list edits" among what saves at once. The root `AGENTS.md` and other packages need no change: no convention, trap or workflow of theirs changes. Verify `oxfmt --check` passes on the file and `openspec validate composer-edit-list --strict` passes. Lint, typecheck and build `web`.

## Workflow follow-up

- `/opsx:archive` once every task is ticked, which merges the `web-trade-browse` and `web-lists` deltas into the main specs.
