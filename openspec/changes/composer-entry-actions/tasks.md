# Tasks

## 1. List dialogs

- [x] 1.1 Add an optional `finalFocus` to `SetPriceDialog`, `SetRatioDialog` and `RemoveFromListDialog` (`features/list/`), passed to their popups. Give `RemoveFromListDialog` an optional `onRemoved`, called in its success path before it closes. Before choosing between that and a function `finalFocus`, read the cnippet Dialog and AlertDialog docs. Verify that `list-view.tsx` passes none, so the list page is unchanged. Lint, typecheck and build `web`.

## 2. Composer

- [x] 2.1 Load `vercel-react-best-practices` and `vercel-composition-patterns`. In `preview-entries.tsx`:
  - Turn `EntryThumb` into a `Menu` whose trigger renders the thumbnail face, labelled `trade_composer_objekt_options` or `_options_ratio`.
  - Give it items Set price (sale list with a currency), Set ratio (side has a ratio) and, after a separator, Remove from list. Each calls an `open*` callback passed in.
  - Drop `EntryRatioPicker`.
  - Add the two labels in en, ko (합니다체 where a sentence) and ja. Remove `trade_composer_objekt_ratio` and `_ratio_set` once nothing calls them.

  Lint, typecheck and build `web`.
- [x] 2.2 In `PickedSide` (`preview.tsx`) and in `AllObjekts`, call `useEntryDialogs()` once and render the three dialogs for the side's slug, currency, ratio side and list ratio. Point the remove's focus target at the next thumbnail, else the Add objekts tile in the preview and the sheet's title (`tabIndex={-1}`) in "+N". Return price, ratio and a cancelled remove to the thumbnail. Lint, typecheck and build `web`.
- [x] 2.3 Verify on local at 390 px and at desktop width, in a tab of its own on the automation Chrome, against the `web-trade-browse` "Objekt menu in the composer" and "Ratios in the preview" scenarios:
  - Each side offers the right items.
  - Remove, price and ratio save and keep the picks.
  - Focus lands as the scenarios say, after keyboard and pointer alike.
  - The "+N" sheet stays open after a remove.

  Removes, prices and ratios write, so do them on the local database only. Against production, verify up to the `list.removeObjektsFromList`, `list.updateEntryPrices` and `list.setRatio` requests ("read-only verified").

## 3. Docs

- [x] 3.1 In the "Post composer" paragraph of `apps/web/AGENTS.md`, say that each thumbnail opens a menu of the list page's entry dialogs, mounted once per side, and add removals and prices to what saves at once. The root `AGENTS.md` and the other packages need no change, since none of their conventions changes. Verify that `oxfmt --check` passes on the file and that `openspec validate composer-entry-actions --strict` passes. Lint, typecheck and build `web`.

## 4. Review follow-up

- [x] 4.1 Make `finalFocus` a lookup by entry id at close time, so a remove that remounts the next thumbnail ("+N" sheet row change, the objekt behind "+N" sliding in) still lands focus on it. Verify both cases on local.
- [x] 4.2 Give the inert ratio chip's worded tooltip to the card in Trade's "+N" sheet and to the composer's menu trigger. Move `QTY_BADGE` and `RATIO_ON_CARD` into `objekt-card.tsx`, fix the stale comments, and reword the "+N" sheet's description for every side (en, ko, ja).
- [x] 4.3 Bring the proposal, design, delta spec and `apps/web/AGENTS.md` in line with the price caption, the corner chip and the focus lookup. `openspec validate composer-entry-actions --strict` passes.

## Workflow follow-up

- `/opsx:archive` once every task is ticked, which merges the `web-trade-browse` delta into the main spec.
