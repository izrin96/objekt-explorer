# Tasks

The working tree already holds a draft of this change; each task checks that draft against the spec and design and finishes what it lacks.

## 1. Grouped source control

- [x] 1.1 Give `SingleSelect` (`features/filters/single-select.tsx`) an optional `group` per option, drawn as a labelled `SelectGroup`; verify an ungrouped caller (a list or profile dropdown elsewhere) renders as before, and `bun run lint`, `bun run typecheck` and `bun run build --filter=web` pass

## 2. Attach objekt drawer

- [x] 2.1 Fold `OwnedPicker` and `ListPicker` into one picker in `attach-objekt-dialog.tsx` with one filter state and one source control (profiles under My objekts, lists under My lists), keeping the grids as `attach-owned-grid.tsx` and `attach-list-grid.tsx`; verify in the running app that picking a list shows "List · <name>" with its cards, that filters survive a source switch, and that a pick attaches the card and closes
- [x] 2.2 Open the picker in a bottom `SheetPopup` with New post's height classes and title block, cards at the default width; verify at 1440 px and 390 px that it matches New post's Add objekts drawer, and that Escape, the close button and a pick each return focus to Add to message
- [x] 2.3 Remove `chat_attach_no_lists` from `messages/en.json`, `ko.json` and `ja.json`; verify no source refers to it and `bun run lint`, `bun run typecheck` and `bun run build --filter=web` pass

## 3. Docs

- [x] 3.1 Check `apps/web/AGENTS.md` and the root `AGENTS.md` for conventions this change alters; neither names the attach picker or `SingleSelect`, so record in this task that none changed unless the check finds otherwise. Checked: neither file names the attach picker, `SingleSelect` or its options, so neither changed

## Workflow follow-up

- Archive the change once reviewed, so the `web-chat` Thread view requirement carries the new paragraph.
