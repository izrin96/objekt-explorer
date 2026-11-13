# Tasks

All paths are under `apps/web/src/features/trade/composer/` unless they say otherwise. "Checks pass" means `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web` all pass, run from the repo root. Read `apps/web/AGENTS.md` and `apps/web/docs/trade.md` (Post composer) first. Load `vercel-react-best-practices` before editing any `.tsx`.

Browser checks run on the dev server against the local database. Before the first one, confirm that the root `.env.local` sets `DATABASE_URL` to the local Postgres. The root `.env` is production.

- **Writes.** A write (add, remove, price, ratio, add to list) needs the user's go-ahead for that check. Without it, verify the dialog and the request it would send, then cancel, and record the check as "read-only verified".
- **Wording.** English only in the checks.

## 1. Clear the prototype

- [x] 1.1 Confirm the prototype is saved, then delete it.
  - It was saved on 2026-11-13 as `.claude/worktrees/prototypes/composer-all-objekts-ui.patch` (three `diff --git` entries), beside the earlier prototype patches. Its files are untracked, so deleting them without that patch loses them. If the patch is missing or the prototype files changed since, rebuild it from `git diff -- apps/web/src/features/trade/composer/preview.tsx` followed by `git diff --no-index /dev/null <file>` for `proto-all.tsx` and `proto-variant.ts`. Use no command that changes the index or the stash.
  - Delete `proto-all.tsx` and `proto-variant.ts`.
  - Remove every block marked `PROTOTYPE` from `preview.tsx` by hand: the two imports; `variant`, `allVariant` and `bottom`; the variant branch in the sheet; and `<ProtoSwitcher />`. Restore `side={sheet?.view === "add" ? "bottom" : "right"}` and the `className` ternary on `sheet?.view === "add"` / `"all" || "rule-objekts"`.
  - Verify:
    - `rg -n "PROTOTYPE|proto-" apps/web/src` finds nothing;
    - `git diff -- apps/web/src/features/trade/composer/preview.tsx` is empty, or shows only changes that are not the prototype's (report them);
    - checks pass.

## 2. Shared parts, with no change to Add objekts

- [x] 2.1 Move `tickedName` from `add-objekts.tsx` into a new `ticked-name.ts`, exported with a one-line doc comment. `add-objekts.tsx` imports it (design, Decision 7). Checks pass.
- [x] 2.2 Create `ticked-tray.tsx` exporting `TickedTray` and the `Ticked` type.
  - Move in the private `Tray` and `TickedList` from `add-objekts.tsx`, and `Ticked` from `add-objekts-grids.tsx`.
  - Add the `action?: ReactNode` slot, drawn before Clear.
  - Keep the props `ticked`, `onUntick(key, objekt)`, `onClear`, `scrollClassName` and `listClassName`.
  - `add-objekts.tsx` and `add-objekts-grids.tsx` import from it.
  - Verify: `rg -n "function Tray|function TickedList" apps/web/src` finds only `ticked-tray.tsx`, and checks pass.
- [x] 2.3 Create `tick-tile.tsx` exporting `TickTile`, moved from `add-objekts-grids.tsx`.
  - Add the props `overlay?: ReactNode`, drawn inside the tile's `relative` box, and `caption?: ReactNode`, drawn under the tile and outside the `role="button"` element.
  - Set `aria-label={tickedName(objekt)}`.
  - The tile stays a `div role="button"`, not a `<button>`. Keep the WebKit comment.
  - `add-objekts-grids.tsx` uses it.
  - Checks pass.
- [x] 2.4 Give Add objekts one persistent title (design, Decision 5).
  - Move the `SheetTitle` out of `AddObjektsBody` into `AddObjektsSheet`, so the loading state and the body share one element. `AddObjektsBody` keeps the description.
  - Give the title `ref`, `tabIndex={-1}` and `outline-none`.
  - Add a `focusTitle?: boolean` prop that focuses the title once on mount when set.
  - No caller sets it yet.
  - Browser check at 1280 px and 390 px on a have list and a sale list:
    - Add objekts from the tile looks, filters, ticks, unticks from the tray, clears and adds as before;
    - each tile is named like "Lynn SCO #12".
  - Checks pass.

## 3. Bulk focus in `useSideDialogs`

- [x] 3.1 In `use-side-dialogs.tsx`, give `bulkActions.price`, `.ratio` and `.remove` a second argument, `from: HTMLElement | null` (design, Decision 10).
  - Make the focus target a union of the entry target and `{ kind: "bulk", from, removed }`. `onRemoved` sets `removed` on either kind.
  - A bulk target's `finalFocus`:
    - after a remove, `fallback`;
    - otherwise `from` while `from?.isConnected` and not `disabled`;
    - else `fallback`.
  - `null` keeps today's behaviour (`fallback`). Pass `null` from the old `AllObjekts` in `preview-entries.tsx` until task 4.2 deletes it.
  - Update the doc comment above `useSideDialogs`.
  - Checks pass.

## 4. The All objekts sheet

- [x] 4.1 Add the new en keys to `apps/web/messages/en.json`, beside the other `trade_composer_all_*` keys, as listed in the design's Decision 4 table (the "add" rows only). Run `bun run paraglide:compile` in `apps/web`. Checks pass.
- [x] 4.2 Create `all-objekts.tsx` exporting `AllObjektsSheet({ slug, name, ratio, onAdd })` and wire it in (design, Decisions 1, 2, 8, 9 and 12).
  - **Shell.** `SideAddToList` around a private body.
  - **Header.** A `SheetTitle` with `ref`, `tabIndex={-1}`, `font-display text-lg outline-none`, reading `m.trade_composer_all_title({ list: name })`. A `SheetDescription` with `max-md:sr-only`, rendered once the entries are known.
  - **Filters.** `PickerFilterBar` on local filters.
  - **Grid.**
    - A `VirtualCardGrid` of `TickTile`s keyed by `String(entryId)`, inside a `data-entry-grid` wrapper.
    - A side with a ratio gets `RatioChip` as the `overlay`, with `RATIO_ON_CARD` and `owner`, and `inherited` from `appliedRatio`.
    - A sale side with a currency gets `PriceCaption` as the `caption`: the price formatted with `formatPrice(currency, entry, false)`, so an unpriced card reads "No price" and not the "Set price" call to action, since the text is not a button; muted when the entry has no price and no QYOP, its note, and no `onPriceClick`.
  - **Ticks.** Local ticks as a `Set` of `entryId`s, with the ticked entries derived from the entries.
  - **States.** Loading, error with Retry, empty, and no match.
  - **Entries.** Read with the same call `PickedSide` uses (`listEntriesOptions(slug, [])`, or `useListEntries(slug, [])` if `slim-list-entries` has landed).
  - **Wiring in `preview.tsx`:**
    - drop `select` from the `"all"` view;
    - make `side` `"bottom"` for `"add"` and `"all"`;
    - give `className` the bottom sheet's height for both bottom views, `sm:max-w-3xl` for `"rule-objekts"` only, and `sm:max-w-lg` otherwise;
    - make "+N" and the Select button open `{ view: "all", slug, name, ratio }`;
    - render `AllObjektsSheet` with `onAdd` as a no-op for now.
  - **Removals.**
    - In `preview-entries.tsx`, delete `AllObjekts` and `SelectThumb`, `EntryThumb`'s `currency` prop and `PriceCaption` branch, and the imports they leave unused.
    - In `en.json`, change `trade_composer_all_title` and `trade_composer_all_desc` as in the table and delete `trade_composer_all_select_desc`. If `paraglide:compile` or typecheck then fails on ko or ja still carrying the old shape, make the same change and deletion in `ko.json` and `ja.json` here, and leave the translation pass to 5.1.
  - **Browser check** at 1280 px on a have side holding more than 22 objekts:
    - "+N" and Select open the sheet from the bottom, as tall as Add objekts', titled "All of {list}";
    - cards show names, serials and ratio chips;
    - a tap and Space tick and untick;
    - the search filters, and an impossible search says "Nothing matches these filters";
    - on a sale side the price and note show under each card, and the note button opens without ticking;
    - the preview's thumbnails still open their menus.
  - `rg -n "useSelection|SelectBar" apps/web/src/features/trade/composer` finds nothing. Checks pass.
- [x] 4.3 Add the column from `md` (design, Decisions 9 to 11), in a `md:grid-cols-[minmax(0,1fr)_16rem]` layout like Add objekts'.
  - **Tray.** `TickedTray` with `scrollClassName="flex-1"` and `listClassName="grid-cols-3"`, its `action` slot holding the Tick all button:
    - `trade_composer_all_tick_all` and `_untick_all` with no filter on, `_tick_shown` and `_untick_shown` with one;
    - disabled with no rows.
  - **Actions,** in order:
    - Set ratio (`filter_set_ratio`, a side with a ratio);
    - Set price (`filter_set_price`, a sale side with a currency);
    - Add to another list (`trade_composer_all_add_to_list`, through `useOpenAddToList()`);
    - Remove (`variant="destructive-outline"`, `trade_composer_all_remove` with the count, or `_remove_none` at 0).
  - **Action behaviour.** Each action is `disabled` at 0 and calls `bulkActions.*(selected, event.currentTarget)`.
  - **Live count.** A visually hidden `aria-live="polite"` paragraph, mounted from the start, reading `trade_composer_all_ticked_live`.
  - **Browser check** at 1280 px on a have, a sale and a Buy-post want side:
    - the actions each side offers match the spec;
    - Tick shown and Untick shown follow the filter;
    - ticks survive a filter change, and the tray lists hidden ticks;
    - each dialog's Cancel returns focus to its button;
    - with VoiceOver or the accessibility tree, a tile reads its name and pressed state, and the count is announced;
    - the column's buttons are reachable with Shift+Tab from the header.
  - Checks pass.
- [x] 4.4 Add the row below `md`: a ticked-count popover trigger holding `TickedTray` (`scrollClassName="max-h-64"`, `listClassName="grid-cols-4"`), a Change `Menu`, and Remove.
  - The Change menu (`trade_composer_all_change`) holds Set ratio, Set price and Add to another list as the side offers them. Its items pass the trigger's ref as `from`.
  - Remove reads `trade_composer_all_remove` with the count, or `_remove_none` at 0, as the column's does: the tray is closed on a phone, so the count on Remove is what shows how many a filter hides.
  - The count trigger keeps one width as the count changes (`tabular-nums` and a `min-w-*` that fits three digits), so Change and Remove don't shift. The prototype's shifted.
  - The tray popover is `align="start"` with `w-80 max-w-full`, as Add objekts' is.
  - Change and Remove are disabled at 0.
  - **Browser check** at 390 px on a have and a sale side:
    - the row fits without sideways scroll, with "Remove 999" on a list name of three lines;
    - ticking a first and a tenth card moves neither Change nor Remove;
    - the description is hidden but present in the accessibility tree;
    - Set price from Change returns focus to Change on cancel and on save.
  - Checks pass.
- [x] 4.5 Wire Add objekts and the sheet's own focus return (design, Decisions 5 and 6).
  - The header's Add objekts button (`variant="outline" size="sm"`, `PlusIcon`, `trade_composer_all_add`) calls `onAdd`.
  - In `preview.tsx`:
    - `onAdd` is `openSheet({ view: "add", slug, name, focusTitle: true }, opener.current)`, and the `"add"` view passes `focusTitle` to `AddObjektsSheet`;
    - add `data-add-tile={slug}` to the side's Add objekts tile;
    - make `SheetPopup`'s `finalFocus` a function returning, in order, `opener.current` while connected, the tile matching `[data-add-tile="${CSS.escape(slug)}"]` inside the preview's `<section>` (a ref on it), or `null`.
  - Keep the slug of the open sheet in the `sheet` state the function reads.
  - **Browser check:**
    - Add objekts swaps the sheet without it closing or animating, and focus lands on "Add to {list}";
    - Cancel, the close button and Escape return focus to "+N", or to Select when Select opened it;
    - read-only verified: the Add request carries the ticked objekts.
  - Checks pass.

## 5. Messages, docs and checks

- [x] 5.1 Mirror task 4's message changes in `apps/web/messages/ko.json` and `ja.json`: the same keys added, the two changed and the one deleted.
  - ko uses 합니다체.
  - ja keeps the full-width ？ and ends a sentence with 。 where the en text ends with a full stop.
  - Keep `{count}` and `{list}` as they are.
  - Verify that the `trade_composer_all_*` key sets of the three files are equal (`jq -r 'keys[]' <file> | rg '^trade_composer_all_' | sort`, diffed), and that `bun run paraglide:compile` in `apps/web` passes. Checks pass.
- [x] 5.2 Update `apps/web/docs/trade.md`, Post composer.
  - Replace the sentence "Each thumbnail, in the preview and its "+N" sheet, is a menu … under its card." with:
    - the preview's thumbnails are menus through `useSideDialogs`' `actions`;
    - "+N" and Select open `AllObjektsSheet` (`composer/all-objekts.tsx`), the Add objekts sheet's shape, with ticks as local entry ids, filtering in the browser, and `bulkActions` taking the control to return focus to;
    - its Add objekts swaps the sheet's content in place and focuses the Add sheet's title;
    - `TickedTray`, `TickTile` and `tickedName` are shared by both sheets.
  - In the focus sentence, change "else the Add objekts tile or the sheet's title" to name the preview only, and add the sheet's rule: the opening control, else its title after a remove.
  - Verify: `rg -n "\"\\+N\" sheet|select mode" apps/web/docs/trade.md` finds no stale claim, and `bun run format` leaves the file unchanged. Checks pass.
- [x] 5.3 Run `bun run check` and `bun run build --filter=web` from the repo root; both pass. Run `bun run knip` (advisory) and confirm it reports no export this change left unused in `features/trade/composer/`.
- [x] 5.4 Browser check of the whole flow at 390 px and 1280 px on a Swap post (have and want sides), a Sell post (sale side in a currency) and a Buy post (want side). Cover:
  - "+N" on a list of more than 22, and Select on a list of 22 or fewer;
  - ticking, Tick all and Tick shown, and the tray;
  - each action's dialog, with focus after cancel and after save;
  - Add objekts from the sheet;
  - closing back to the opener;
  - no horizontal overflow reported by the dev overflow guard.

  A confirmed Remove (focus to the title, and ticks dropping) and the "+N" tile disappearing need a real remove: ask the user for approval on a local test list, or record them as not verified. Record each check as passed, "read-only verified" or not verified. Checks pass.
- [x] 5.5 `AGENTS.md` files.
  - Re-read the UI kit rule in `apps/web/AGENTS.md`. It names `VirtualCardGrid` under a filter bar for sheets, which the new sheet follows, and Trade's "+N" sheet, which this change leaves alone. Change it only if it now says something false.
  - State in the change's final report that `apps/web/AGENTS.md` and the root `AGENTS.md` needed no change, or what changed and why.
  - Checks pass.

## Workflow follow-up

- If `slim-list-entries` is applied after this change, its task 4.2 no longer has an `AllObjekts` to move: point its hook at `AllObjektsSheet`, and replace its check "Set price and Remove from the sheet act on the right entry" with ticking one card and acting on it.
- Archive with spec sync after the deploy.

## Results (2026-11-13)

Local lists held 4 objekts at most, and no write was approved, so every dialog was cancelled.

- **Passed, 1280 px, Swap have side:** Select opens the sheet from the bottom titled "All of {list}"; cards named with serials; ticks, the tray, Tick all and Untick all; "2 ticked" in the live region; Cancel on Set ratio, Remove and Add to another list returns focus to its button; Add objekts swaps in place with focus on "Add to {list}"; Escape returns focus to Select.
- **Passed, 1280 px, Sell sale side:** the price shows under the card, outside the tile's control; the column offers Set price and no Set ratio.
- **Passed, 390 px, Swap have side:** no sideways scroll; the description is 1 px (screen readers only); the row's Change and Remove keep their places from 0 to 3 ticked, and Remove reads its count; Change offers Set ratio and Add to another list, and both return focus to Change.
- **Passed after seeding** (the user approved it: 24 owned objekts added through Add objekts to the local scratch list "have 3 (copy) refused-sim (copy) (copy)", then 6 of them removed, leaving 22):
  - 1280 px: the Add request went through and the preview showed 22 thumbnails and "+6"; "+6" opens the sheet with 28; the grid scrolls; Space ticks a focused card and "1 ticked" is announced.
  - A confirmed "Remove 6": the list drops to 22, nothing is ticked, every action is disabled, "0 ticked" is announced, and focus is on the sheet's title. Closing then puts focus on the side's Add objekts tile, since "+N" is gone.
  - Tick shown ticks only the 3 a search shows and turns to Untick shown; an impossible search says "Nothing matches these filters", disables the button and keeps the 3 in the tray with "Remove 3".
  - 390 px: with 22 ticked the row reads "22", Change, "Remove 22" at the same places and widths as at 0; the grid scrolls; no sideways scroll.
  - Want side: on a Swap post the column offers Set ratio, Add to another list and Remove, and a card with a ratio carries it as its tooltip; on a Buy post no Set ratio and no tooltip.
- **Not verified:** a saved price or ratio (focus after save, ticks kept); a note's button under a sale card (no local entry has a note); ko and ja in the column; Safari; VoiceOver.
- **5.5:** `apps/web/AGENTS.md` and the root `AGENTS.md` needed no change. The UI kit rule already names `VirtualCardGrid` under a filter bar, which the sheet follows.
- **After review:** the tile carries its ratio as `title` (the chip is inert and the tile's name hides its text); the tray's heading row wraps; the live region also announces 0; the Add-tile focus fallback applies to the All objekts and Add objekts views only.
