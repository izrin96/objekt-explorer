# Design

## Context

`AttachObjektDialog` (`features/chat/attach/attach-objekt-dialog.tsx`) is opened by the composer's Add to message and by "Pick objekts instead". It held two tab panels, `OwnedPicker` and `ListPicker`, each with its own filter state, source `SingleSelect` and grid. New post's `AddObjektsSheet` (`features/trade/composer/add-objekts.tsx`) is opened in a bottom `SheetPopup` from `trade/composer/preview.tsx`, at `h-[88dvh]` and the default card width of `useCardColumns`.

## Goals / Non-Goals

**Goals:**

- One picker component, one filter state, one source control.
- The drawer and card size match New post's, through the same components and classes rather than a copy of its layout.

**Non-Goals:**

- Sharing a component with `AddObjektsSheet`: that sheet ticks many cards into a tray and saves to a list, while Attach objekt picks one card and closes. They share the sheet, the filter bar and the grid, which are already shared components.

## Decisions

- **Sheet over Dialog.** `SheetPopup side="bottom"` with New post's height classes, and its title block (`font-display pe-8 text-lg`, description `max-md:sr-only`). `finalFocus` passes through as before, so focus still returns to Add to message. The component keeps its name and file; a rename to `AttachObjektSheet` is optional and touches one caller.
- **Grouped `SingleSelect` over a new source component.** `SingleSelect` gains an optional `group` per option; consecutive options with the same group render as a Base UI `SelectGroup` with a `SelectGroupLabel`. No `SelectSeparator`: it renders `role="separator"` inside the listbox, where ARIA allows only options and groups, and the labels already split the groups. Options without a group render exactly as before, so the other callers are unchanged. A new component would have repeated the toolbar trigger, the value label and the typing behaviour `SingleSelect` already has.
- **The trigger stays plain.** `defaultValue` is the current source, so a picked source never reads as an active filter that Reset would clear.
- **Source as one value.** The picked source is a single select value, `profile:<address>` or `list:<slug>`; a pick that no longer exists (an unlinked profile, a deleted list) falls back to the first option. The grid is chosen from the prefix and keyed by the source, so a switch starts at the top even when the new source's query is cached. A tagged object would avoid the string parsing; the string keeps the select's value a plain string, which `SingleSelect` requires.
- **Default card width.** The grids use `useCardColumns`' default target, the one New post's grid uses. A per-grid width option was tried for larger cards and dropped once the drawer matched New post.
- **Empty state.** With no source at all the picker shows the existing Link a Cosmo profile state; a user with a profile and no lists simply sees no "My lists" group. `chat_attach_no_lists` has no other use and is removed from every locale.

## Risks / Trade-offs

- [A user with lists but no profile, or a profile but no lists, no longer sees a prompt to make the other] → Lists and profiles are taught on their own pages; the drawer stays one control.
- [A long list of lists makes the source popup long] → The popup scrolls; the same holds for New post's list dropdowns.
- [Filters kept across sources can show "Nothing matches" right after a switch] → Reset is beside the filters, and keeping them is what a user narrowing by member expects.
