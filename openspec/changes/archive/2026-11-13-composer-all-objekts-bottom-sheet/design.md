# Design

## Context

See proposal.md (Why). Code lives in `apps/web/src/features/trade/composer/`.

- **The shell.** `ComposerPreview` (`preview.tsx`) owns one `<Sheet>` for every sheet a side opens. It keeps a `SheetView` with a `session` counter, used as the content's `key`, so each open remounts the content. `openSheet(view, from?)` records the opener in `opener`, a ref that is the popup's `finalFocus`. The `"all"` view carries `select: boolean`.
- **Today's All objekts.** `AllObjekts` in `preview-entries.tsx`.
  - It reads the side's entries with `listEntriesOptions(slug, [])`, the query `PickedSide` already loaded, so the data is warm when the sheet opens.
  - It draws `EntryThumb` (a menu per card) or `SelectThumb` in a `PanelCardGrid` inside a `SheetPanel`.
  - Select mode runs on the global `useSelection` store, which the sheet clears on mount and on unmount, and on `SelectBar`.
- **`useSideDialogs`** (`use-side-dialogs.tsx`) mounts the list page's Set price, Set ratio and Remove dialogs once per side.
  - `actions` take the thumbnail and return focus to it, or after a remove to the next one, looked up by `data-entry-thumb` inside `data-entry-grid`.
  - `bulkActions` set the target to `null`, so focus falls back to `fallback`, the sheet's title.
- **Add objekts** (`add-objekts.tsx`, `add-objekts-grids.tsx`).
  - Ticks live in local state, a `Map<string, ValidObjekt>` keyed by token id or slug (`Ticked`).
  - The private `Tray`, `TickedList`, `tickedName` and `TickTile` draw the tray and the tiles.
  - Its `SheetTitle` has no ref and renders in two branches: loading, and `AddObjektsBody`.
- **The prototype.**
  - `proto-all.tsx` holds `ProtoAllSheet` (variant B, the one the user picked) and `ProtoAllRows` (variant C).
  - `proto-variant.ts` holds a sessionStorage switcher.
  - `preview.tsx` has blocks marked `PROTOTYPE`.
  - The prototype copies the tray and the tile, hardcodes English, and nests `ObjektNote`'s button inside a `role="button"` tile (see Decision 2).
- **`slim-list-entries`** (in flight) replaces `listEntriesOptions` with `useListEntries(slug, [])` in `preview.tsx` and `preview-entries.tsx` (its task 4.2). Its check of "Set price and Remove from the sheet" assumes today's per-card menu.

## Goals / Non-Goals

**Goals:**
- One shared Ticked tray and one shared tick tile behind both sheets. Add objekts keeps its behaviour.
- Selection state that cannot leak between sheets or into other surfaces' `useSelection`.
- Every action's focus return is stated and lands on an element that is still on the page.

**Non-Goals:**
- Changing `SelectBar`, `useSelection`, `RuleObjektsSheet`, `side-items-sheet.tsx` or the list page.
- Changing how the preview's 22 thumbnails behave (`EntryThumb`'s menu, `actions`).
- Paging the sheet: it shows the entries the preview already holds, as today.

## Decisions

### 1. The shell: the `"all"` view uses the bottom sheet

In `preview.tsx`:
- `SheetView`'s `"all"` drops `select`.
- `side` is `"bottom"` for `"add"` and `"all"`, and `"right"` otherwise.
- `className` is the existing `h-[88dvh] max-sm:h-[calc(100dvh-(--spacing(12)))]` for both bottom views, `sm:max-w-3xl` for `"rule-objekts"` alone, and `sm:max-w-lg` for `"rule"`.
- `"+N"` and the Select button both call `onOpenSheet({ view: "all", slug, name, ratio })`.

`RuleObjektsSheet` keeps its drawer, since it shows what a rule covers and holds no entries to act on.

### 2. One mode: a tap ticks, no menu on the sheet's cards

The sheet's cards are tick tiles only. The preview's thumbnails keep their menus (`EntryThumb`, `actions`).

- **Cost.**
  - Removing one objekt takes as many taps as today: tick, Remove, confirm, against menu, Remove from list, confirm.
  - The extra cost falls in two places. When other cards are already ticked, the viewer clears or unticks them first. Repricing one card on a phone is tick, Change, Set price, against one tap on the price today.
  - The first 22 objekts keep their one-tap menus in the preview, which covers most single edits.
- **Price under the card.** The price is plain text and `ObjektNote` keeps its button. Both sit under the tile, outside the `role="button"` element, as `EntryThumb` places `PriceCaption` today. A control nested inside a control has no name of its own, and its click would also tick the card. The prototype has that defect, so this is not taken from it.
- **Alternatives.**
  - Keep a menu on each card in the sheet, with ticking as a second mode. Rejected: that is today's two-mode sheet, which the user turned down.
  - Keep the price as a button opening Set price for its one card. Rejected: a second meaning for a tap in a one-mode grid. It is listed under Open questions.

### 3. The Select button stays as it is

It keeps its label (`trade_composer_select_list`, "Select objekts in {list}"), its check-square icon and its rule (shown while the side holds at least one objekt), and opens the same sheet as "+N". It is the only way into the sheet for a side of 22 objekts or fewer, which has no "+N" tile, and ticking objekts is what the sheet is for, so "Select" still describes it.

- **Alternatives.**
  - Remove it. Rejected: it would leave a short list no bulk actions.
  - Rename it "Show all of {list}", the wording of Trade's ⋯ menu. Rejected: on a short list everything is already shown, so the name would promise nothing new.
  - Make the side's count a button. Rejected: a hidden affordance.

### 4. Title "All of {list}", and the message keys

"All of spares" pairs with Add objekts' "Add to spares": a short phrase, then the list's name. It keeps the "All" the sheet had, and matches Trade's "Show all of {list}". The prototype's bare list name reads as the list page, not as one sheet of the composer.

Messages in `apps/web/messages/{en,ko,ja}.json`:

| Key | Change | en |
| --- | --- | --- |
| `trade_composer_all_title` | text and a new `{list}` parameter | "All of {list}" |
| `trade_composer_all_desc` | text; drops `{list}` | "{count} on this list. Tap cards to tick them, then change or remove them together." |
| `trade_composer_all_select_desc` | delete | |
| `trade_composer_all_add` | add | "Add objekts" |
| `trade_composer_all_tick_all` | add | "Tick all" |
| `trade_composer_all_untick_all` | add | "Untick all" |
| `trade_composer_all_tick_shown` | add | "Tick shown" |
| `trade_composer_all_untick_shown` | add | "Untick shown" |
| `trade_composer_all_add_to_list` | add | "Add to another list" |
| `trade_composer_all_change` | add | "Change" |
| `trade_composer_all_remove` | add | "Remove {count}" |
| `trade_composer_all_remove_none` | add | "Remove" |
| `trade_composer_all_empty` | add | "Nothing on this list yet" |
| `trade_composer_all_ticked_live` | add | "{count} ticked" |

- **Kept and reused as they are:**
  - `trade_composer_select_list`;
  - `filter_set_price` and `filter_set_ratio` for the action labels;
  - the tray's `trade_composer_add_ticked`, `_clear`, `_tray_empty` and `_untick`, and `trade_composer_add_no_match`, now read by the shared files.
- **Renaming the shared `add_` keys** to a `trade_composer_tray_*` family was rejected: it touches three locales and every reader for no visible change.
- **Labels.** "Add to another list" says which list; a bare "Add to list" sits ambiguously beside Add objekts. The four Tick and Untick labels are whole strings, never built from parts, so ko and ja can order them freely.

### 5. Add objekts: swapped in place, then back to the page

The header's Add objekts calls `openSheet({ view: "add", slug, name }, opener.current)`:
- the same `<Sheet>`, the same side and size, so nothing animates;
- a new `session`, so the content remounts;
- the original opener kept as the return target.

Adding, Cancel and closing close the sheet to the page, as Add objekts does from its tile. The new objekts show in the preview at once.

- **Focus on the swap.** The focused button unmounts with All objekts. Base UI moves focus only when the popup opens, so focus would fall to the body.
  - `AddObjektsSheet` gains a `focusTitle` prop, set when it is opened from All objekts. Its `SheetTitle` gets `ref`, `tabIndex={-1}` and `outline-none`, and an effect focuses it on mount while `focusTitle` is set.
  - The title moves up from `AddObjektsBody` into `AddObjektsSheet`, so the loading state and the body share one title element and focus survives the list loading. `AddObjektsBody` keeps the description and the rest.
  - The `"add"` view carries `focusTitle?: boolean`. Its tile leaves it unset, so opening from the tile is unchanged.
- **Alternative.** Return to All objekts after Add or Cancel, a back stack of one. Rejected for now:
  - below `md` the sheet's close button stands in for Cancel, so "back" and "close" would need two controls the phone row has no room for;
  - the user approved the prototype, which closes to the page.

  It is listed under Open questions.

### 6. The sheet's own focus return

`SheetPopup`'s `finalFocus` becomes a function:
- `opener.current` while it `isConnected`;
- else the side's Add objekts tile, found by `data-add-tile={slug}` (a new attribute on the tile, read with `CSS.escape`) inside the preview's `<section>`;
- else `null`.

"+N" disappears once a list drops to 22 objekts, and Select disappears at 0, so a remove inside the sheet can take the opener away.

### 7. Shared parts, in the composer folder

Both readers live in `features/trade/composer/`, so the parts stay there (Feature order: nothing outside the composer needs them).

- **`ticked-name.ts`**: `tickedName(objekt)`, moved from `add-objekts.tsx`. It returns "Lynn SCO #12", or "Lynn SCO" with no serial. It is a helper, so it goes in a `.ts` module (Where code goes).
- **`ticked-tray.tsx`**: `TickedTray`, the private `Tray` and `TickedList` moved together. It also takes the `Ticked` type, which `add-objekts-grids.tsx` then imports. Props:
  - `ticked: Ticked`, a `ReadonlyMap<string, ValidObjekt>` drawn in map order;
  - `onUntick(key, objekt)`;
  - `onClear()`;
  - `scrollClassName`;
  - `listClassName`;
  - `action?: ReactNode`, drawn before Clear, which All objekts fills with Tick all.

  The focus rules (untick to the next control, else the heading; Clear to the heading) move with it unchanged.
- **`tick-tile.tsx`**: `TickTile`, moved from `add-objekts-grids.tsx`. Props:
  - `objekt`, `ticked` and `onToggle`;
  - `overlay?: ReactNode`, inside the tile's `relative` box, for the ratio chip (`RATIO_ON_CARD`);
  - `caption?: ReactNode`, drawn under the tile and outside the button, for `PriceCaption`.

  It sets `aria-label={tickedName(objekt)}` and stays a `div role="button"`, since WebKit collapses the card's `aspect-ratio` inside a `<button>`.
- **Effect on Add objekts.** Its tiles gain an explicit name ("Lynn SCO #12"). Today the name comes from the card's contents, which change with the hide-label setting. This is the only change Add objekts sees.
- **Reuse checked.**
  - `features/offers/objekt-tile.tsx` (`ObjektTile`) and `candidate-tile.tsx` are pressable tiles built on `OfferThumb`, with the offer's own caption, marks and notes, and a real `<button>`. Both composer grids draw `ObjektCard`, so swapping in the offer tile would change Add objekts' look and bring the WebKit collapse back.
  - `ObjektCard`'s own `onToggleSelect` is wired to the global select mode (Decision 8).

### 8. Selection: local state of entry ids

`AllObjektsSheet` holds `useState<ReadonlySet<number>>` of `entryId`s.

- The ticked objekts are derived on every render: `entries.filter((entry) => ticked.has(entry.entryId))`.
  - An entry that leaves the list drops out of the ticks with no clean-up step.
  - A saved price or ratio shows in the tray at once.
  - The tray, the count and the actions all read the derived list.
- The tray receives `new Map(selected.map((entry) => [String(entry.entryId), entry]))`, in the list's order.
- The `session` key remounts the sheet on every open, so ticks clear on close.
- Saves keep the ticks, so a second action can follow on the same set.
- **Alternative.** The global `useSelection` store (the config's rule: prefer an existing store). Rejected:
  - it spans every surface, and `ObjektCard` reads `selectIsSelecting`, so ticking here would put any other mounted card in select mode;
  - today's sheet has to clear the store on mount and on unmount to stay clean;
  - it is keyed by `objekt.id`;
  - Add objekts, the shape being matched, already keeps its ticks local.

### 9. Filtering

The sheet holds `useState(NO_PICKER_FILTERS)` and draws `PickerFilterBar`. Its rows are `pickerFiltered(filters) ? filterObjekts(toFilterSearch(filters), entries) : entries`, as `CollectionGrid` filters, all in the browser over the loaded entries.

- **The grid.** `VirtualCardGrid` (a fixed-height body under a filter bar, per `apps/web/AGENTS.md` UI kit) keyed by `String(entryId)`, in a `data-entry-grid` wrapper.
- **Empty and error states.**
  - An empty list shows `EmptyState` with `trade_composer_all_empty`.
  - No match shows `trade_composer_add_no_match` ("Nothing matches these filters").
  - A failed read shows `LoadError` with Retry, as today's sheet does.
  - Loading shows `CardGridSkeleton`.
- **The description** renders once the entries are known, never "0 on this list" while they load.
- **Tick all** works on the filtered rows when a filter is on and on every entry otherwise. Its label follows whether a filter is on and whether every row is ticked. It is disabled while there are no rows.
- **Hidden ticks.** They survive a filter change, and actions apply to them. The tray keeps showing them and Remove carries the count at every width, so nothing is acted on unseen. The prototype's phone row left the count off Remove; the row here carries it, since the tray is closed there.

### 10. Actions and their focus return

`useSideDialogs`' `bulkActions` gain a second argument: `price(objekts, from)`, `ratio(objekts, from)` and `remove(objekts, from)`, where `from` is an `HTMLElement`.

- The focus target becomes a union: the existing entry target, or `{ kind: "bulk", from, removed: false }`.
- `onRemoved` sets `removed` on either kind.
- `finalFocus` for a bulk target returns `fallback` (the sheet's title) after a remove. Otherwise it returns `from` while it `isConnected` and is not `disabled`, else `fallback`.

What each caller passes as `from`:

- **The column's buttons:** the button itself (`event.currentTarget`).
- **The phone row's Remove:** itself.
- **The Change menu's items:** the Change trigger, held in a ref. The item is gone once the menu closes.
- **Add to another list:** calls `useOpenAddToList()(selected)` straight from the body component. The body renders inside `SideAddToList`, which replaces the prototype's render-prop wrapper. `AddToListProvider` takes no `finalFocus`, so Base UI returns focus to the element focused when it opened. In the prototype at 1280 px that is the column's button, as wanted. From the Change menu the item is gone when the dialog closes, so check that case in the browser. If it lands on the body, record it as a follow-up rather than widen `AddToListProvider` here.

After a remove there is nothing ticked, so every action is disabled and cannot take focus. The sheet's title is the next stable place.

### 11. Accessibility

- **Tiles.** Each is a `div role="button" tabIndex={0} aria-pressed` named by `tickedName`, toggled by click, Enter and Space (`activateOnKey`).
- **Live count.** A visually hidden `<p aria-live="polite">` in the sheet body, mounted from the start at every width, reads `trade_composer_all_ticked_live`. The tray's badge is not live: below `md` the tray sits in a closed popover.
- **Disabled actions** use `disabled`, so they leave the tab order, as Add objekts' Add does. The description says what to do first.
- **Tab order.** It follows the visual order: header (Add objekts), filter bar, cards, then the column (tray, actions), then the sheet's close button, which `SheetPopup` renders last. The focus trap wraps, so two Shift+Tabs from the header reach the column's last action without crossing the cards. A skip link was considered and is left for both sheets together (Open questions), so the two sheets stay one shape.
- **Description.** It is `max-md:sr-only`, as Add objekts'.

### 12. Files

- **`all-objekts.tsx`** (new) exports `AllObjektsSheet`: `SideAddToList` around a private body component holding the state above.
- **`preview-entries.tsx`** loses `AllObjekts` and `SelectThumb`, its `useSelection`, `SelectBar` and `PanelCardGrid` imports, and `EntryThumb`'s `currency` prop and `PriceCaption` branch. Only `AllObjekts` passed `currency`.
- **Entry reads.** The sheet reads entries through the same call `PickedSide` uses: `listEntriesOptions(slug, [])` today, or `useListEntries(slug, [])` if `slim-list-entries` has landed.

### 13. The prototype goes

Delete `proto-all.tsx` and `proto-variant.ts`, and every `PROTOTYPE` block in `preview.tsx`: the imports, `variant`, `allVariant`, `bottom`, the variant branch and `<ProtoSwitcher />`. The real sheet is written fresh with `m.*` strings. It never starts as a renamed copy of the prototype, which carries the nested-control defect (Decision 2) and the copied tray.

## Prototype check

Variant B was checked in the browser on 2026-11-13 at 1280, 800 and 390 px, on have, want and sale sides, with every dialog cancelled (no writes). Local lists held 4 objekts at most, so a long list's scroll and the "+N" tile were not seen. What it found, and where this design answers it:

- **Focus after cancelling Set ratio or Remove lands on the sheet's title,** not the button. Decision 10.
- **Add to another list returns focus to its own button** at 1280 px. Decision 10 keeps it.
- **Add objekts from the sheet closes to the page,** with focus on the control that opened All objekts. Decision 5 keeps that.
- **The phone row's Remove shows no count,** and the count button changes width as it ticks, moving Change and Remove. Decision 9 and task 4.4.
- **At 800 px the filter bar wraps to two rows** (Type and Reset filter drop), and the grid keeps 4 columns beside the column. Accepted: Add objekts wraps the same way at that width.
- **No horizontal overflow, clipped text or target under 24 px** at 390 px, with a list name of three lines beside Add objekts and the close button.
- **A Buy post's want side offers no Set ratio,** as the spec says.

## Risks / Trade-offs

- **[A single edit inside the sheet costs more when other cards are ticked, and a phone reprice takes 3 taps instead of 1.]** The preview's first 22 thumbnails keep their one-tap menus, and the tray's Clear is one tap.
- **[An action applies to ticked objekts the filter hides.]** The tray lists them and Remove reads its count ("Remove 5"). The Remove dialog asks first, as the list page's does.
- **[Long lists put every card in the tab order before the column.]** The column is two Shift+Tabs from the header (Decision 11). A skip link is an open question for both sheets.
- **[`slim-list-entries` lands between the two changes.]** Both edit `preview.tsx` and `preview-entries.tsx`. Its task 4.2 moves `AllObjekts`, which this change deletes, and its sheet check assumes the menu. Whichever lands second rebases onto the other's entry hook and drops or rewrites that check.
- **[The content swap leaves focus on the body.]** The Add sheet's title takes focus (Decision 5), and the browser check verifies it.

## Open questions

Each is decided above; the user can overrule it in review.

1. **Title.**
   - Decided: "All of {list}".
   - Alternatives: the list's name alone (the prototype); "In {list}".
   - Recommendation: "All of {list}".
2. **The Select button.**
   - Decided: keep it, its label "Select objekts in {list}" and its icon.
   - Alternatives: rename it "Show all of {list}"; remove it and leave short lists without bulk actions.
   - Recommendation: keep it.
3. **After Add objekts opened from the sheet.**
   - Decided: Add, Cancel and closing return to the page.
   - Alternative: return to All objekts, which needs a back control below `md`.
   - Recommendation: the page.
4. **The price under a card.**
   - Decided: plain text.
   - Alternative: keep it a button opening Set price for that card alone, a one-tap reprice beside the tick.
   - Recommendation: plain text, one meaning per tap.
5. **Ticks after a save.**
   - Decided: Set price, Set ratio and Add to another list keep the ticks.
   - Alternative: clear them after every save.
   - Recommendation: keep, so a second action can follow.
6. **A skip link** past the cards to the Ticked column, in All objekts and Add objekts together.
   - Recommendation: not in this change; a follow-up for both sheets.
7. **The live ticked count in Add objekts too.**
   - Recommendation: yes, as a follow-up, since this change leaves Add objekts' behaviour alone.
8. **Message key names.**
   - Decided: the shared tray keeps its `trade_composer_add_*` keys.
   - Alternative: rename them to `trade_composer_tray_*`.
   - Recommendation: keep.
