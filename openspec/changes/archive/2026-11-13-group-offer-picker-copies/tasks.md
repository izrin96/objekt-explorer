# Tasks

"The interaction spec" in these tasks is `interaction-spec.md` in this change directory; its opening note says which parts apply.

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=@repo/api` or `--filter=web`; `@repo/api` has no build task, so its build is `--filter=web`). Tests are `bun test` on pure modules beside their code. The app works after every group: groups 1 and 2 change no screen beyond what an open tab would see, and group 3 swaps the tiles in one step.

## 1. Pure rules and their tests

- [x] 1.1 `packages/api/src/lib/offer-rules.ts`: in `entriesFitting`, an any-copy ask (`objektId` undefined) fits every entry of its collection, including one that names a copy on a list that shows serials. In `anyCopyScope`, every named token joins the scope whatever `hideSerial` says, and a whole-collection entry still gives null. Update `offer-rules.test.ts`: a shown-named entry fits an any ask; the scope of hidden-named plus shown-named entries is their union; a whole entry still gives null; `matchEntry` still prefers the named list. Verify with `bun test packages/api/src/lib/offer-rules.test.ts`.
- [x] 1.2 `packages/api/src/schemas/offer.ts`: add the optional `hidden` to `candidateItemSchema` (design, Response shape), change `bySerial`'s doc line, and add `listedAsAny(item)` beside it. Add `schemas/offer.test.ts` cases: a whole entry on a shown list (`bySerial`) is listed; `hidden > 0` is listed; `hidden: 0, bySerial: false` is not; a missing `hidden` (a server from before) is listed. Verify with `bun test packages/api/src/schemas`.
- [x] 1.3 `packages/api/src/lib/offer-prefill.ts`: in `itemsOnLists`, match an any item only to offered entries that list the collection as any copy (`entryObjektId(entry) === null`), dropping it when the match runs only through entries that name copies on a list that shows serials. `getChoice` is unchanged. Add tests to `offer-prefill.test.ts` pinning "Which copy a match adds":
  - HaSeul 302Z #88 and #140 named on "doubles" with an any item present: #88;
  - the mixed SooMin 204Z (#615 and #1077 on "spares", two on hidden "quiet haves"): a match through "spares" alone gives #615, and one through "quiet haves" gives any serial;
  - a whole-collection entry still gives any serial.

  Verify with `bun test packages/api/src/lib/offer-prefill.test.ts`.
- [x] 1.4 `apps/web/src/features/offers/quantity.ts`: add `anyTop(item, picks)`, the one top of an any pick (`hidden > 0 ? hidden : min(1, copiesLeft(...))`, never below a count already held, with `hidden` absent read as `bySerial ? 0 : copies`). Add `byCollection(picks)`: a collection's picks together, the any pick first, serials ascending, collections in first-seen order. Extend `quantity.test.ts`: the SooMin case (top stays 2 with both serials picked), the shown-only checkbox case (top 1 until every serial is picked, then 0), a held count of 3 that can only come down, and the display order. Verify with `bun test apps/web/src/features/offers/quantity.test.ts`.
- [x] 1.5 New `apps/web/src/features/offers/copy-groups.ts`, with `copy-groups.test.ts`:
  - `groupItems(items)`: `CopyGroup`s in first-seen order, shown copies by ascending serial, the any item apart, the lists in order, and the shared ratio or null;
  - `tileOf(group, selection, room)`: the tile kind (toggle, count or dialog), its lines as data ("choose", "picked", "all", "none", "can't be offered", "more"), its mark, and whether it is disabled;
  - `anyControlOf(group, selection)`: count, checkbox or none;
  - `selectAll`, `clearGroup`, `applyGroup(selection, group, draft)` (it replaces only the group's copies and its any key);
  - `dialogFooter`, and `confirmOf` (Pick 1 copy / Pick N copies / Remove all / disabled Pick copies).

  The tests cover every row of the interaction spec's tables in sections 3, 4 and 6.1, at the three decided switch positions, and the 50 limit (room, Select all stopping in order). Verify with `bun test apps/web/src/features/offers/copy-groups.test.ts`.

## 2. API: the reads and the rules

- [x] 2.1 `apps/web/src/features/offers/builder/draft.ts`: `resolveGetAsks` keeps an ask only when the any item on the ask's own list is `listedAsAny`, else it resolves to the first sendable copy. Add `draft.test.ts` cases:
  - "Entries that name copies": #40 stands in beside an any item on "doubles" with `hidden: 0, bySerial: false`;
  - the mixed SooMin 204Z: an ask on "spares" resolves to #615 while the any item sits on "quiet haves", and an ask on "quiet haves" keeps the any ask.

  This lands before 2.2, so no prefill changes when the new any items appear. Verify with `bun test apps/web/src/features/offers/builder/draft.test.ts`.
- [x] 2.2 `packages/api/src/services/offer/picker/theirs.ts`, `resolveTheirItems`:
  - work out each collection's spare count once, through the widened `anyCopyScope`;
  - emit the any item for a collection reached only through shown-named entries too;
  - set `hidden` to the spare in-scope copies less the in-scope shown copies that are transferable and unreserved, floored at 0 (design, a2);
  - give the any item the `listSlug` of the first entry that lists the collection as any copy, falling back to a shown entry only when none does (design, i).

  Read-only verify against the local stack: `offer.candidates` (side `theirs`) for a partner with a mixed collection returns `hidden` equal to the hidden copies, and one with a shown-only collection returns `hidden: 0, bySerial: false`.
- [x] 2.3 `createOffer` (`services/offer/index.ts`) needs no code change: check it by request only. A request asking for one any copy over a shown-named collection passes the get-side checks. Asking any copy beside every shown serial is refused `not_owned` naming the collection. Under one post, an any ask is cut to the chosen post's entries. With no `post`, for a recipient with Let people ask from more than one post off, an any ask plus a serial only on "spares" fits "spares" (design, a). Verify each up to the request boundary and record it as "read-only verified": run the checks with a refusal expected, and send nothing. Checked on 2026-11-13 by real requests to the local server as localtest1 to localtest2 (local database only, each offer made was withdrawn, offers 274 to 285): any copy over a shown-named collection passes on "lt2 spares"; any copy beside every shown serial is refused `not_owned` naming the collection; under `post`, two any copies where the post holds one are refused `not_owned` and one passes; with the switch off and no `post`, any copy plus a serial only on "lt2 spares" is sent on it and two any copies are refused `not_owned`. The checks found one fault, fixed with `askCandidates`: a shown serial beside two any copies picked from the hidden list was refused `not_owned` for a recipient taking asks across posts; it now passes in either order as an offer on no one post, and is refused `other_post` with the switch off. A later fix (`anyAsksFit`) changed one outcome above: for a recipient taking asks across posts, two any copies under a `post` that holds one are now sent as an offer on no one post, drawing on the other list; with the switch off they are still refused `not_owned`.
- [x] 2.4 `theirPickerPage` (`picker/theirs.ts`): order the narrowed items by collection (first-seen, any item first, then ascending serial) and end each page at the collection boundary at or below `offset + CANDIDATE_PAGE_SIZE`, a collection over 200 being a page of its own. Move the cut into a pure `pageByCollection(items, offset, size)` in `packages/api/src/lib/offer-paging.ts` with `offer-paging.test.ts`. Verify with `bun test packages/api/src/lib/offer-paging.test.ts`.
- [x] 2.5 `picker/shared.ts`: replace `ownedPage` with `ownedGroupPage` (design, e), one indexer statement that keeps whole collections and returns a `{ receivedAt, id: collection_id }` cursor. `mineCandidates` uses it for the page and cuts `suggested` at a collection boundary. `theirCollectionPage` leads its first page with the kept objekts' whole collections and leaves those collections out of every page. The `objektIds` read is left ungrouped. Verify on the local stack: You give's pages of a holder with doubles never split a collection, the scenario "A collection's copies on one page" holds, and `EXPLAIN ANALYZE` of the statement for a holder of several thousand objekts, against the production indexer with `PGOPTIONS='-c default_transaction_read_only=on'`, stays near today's page read (note the timing in this task).
- [x] 2.6 `packages/api/docs/offers.md`, Offer get sources: add one bullet. It says an any ask fits every entry of its collection and draws on the copies the entries name, or every copy with a whole entry; that `hidden` tells the picker how many only any serial reaches; that `itemsOnLists` matches an any item only to an entry listing it as any copy, and `listedAsAny` decides Make offer for one objekt; and that picker pages never split a collection. Verify the doc names only symbols that exist (`grep` each).

## 3. Web: the grouped picker and the serial dialog

- [x] 3.1 Move `CopyStepper` out of `candidate-tile.tsx` into `features/offers/copy-stepper.tsx`, unchanged, still over the vendored `NumberField`. Give `SelectedMark` (`features/objekt/selected-mark.tsx`) an optional count. Verify the You get count tile works as before in the browser.
- [x] 3.2 `picker-selection.ts` and `offer-picker.tsx`: the context carries `selection`, `room`, `full`, `fullId`, `onToggle`, `onCount` and `onOpen(group)`. `OfferPicker` owns the group whose dialog is open, applies a confirm through `applyGroup`, and caps counts with `anyTop`. Verify typecheck and that Done and Cancel still write or drop the working selection.
- [x] 3.3 `candidate-grid.tsx` and `offer-picker-grids.tsx`: group each section with `groupItems` and key cells by section and collection. `candidate-tile.tsx` draws a `CopyGroup` through `tileOf`:
  - the toggle, count and dialog kinds, `aria-pressed` or `aria-haspopup="dialog"`, `aria-disabled` with `aria-describedby` on a full side;
  - the accessible name "{label}, {first line}";
  - the ratio chip only when shared.

  Add each new string to `apps/web/messages/en.json` as it is used (`_one` keys for 1). Verify in the browser that every tile state in the interaction spec's section 3 table, at the decided switches, shows on You get, You give and the collection picker.
- [x] 3.4 New `features/offers/serial-dialog.tsx`:
  - the vendored `Dialog` parts nested inside the picker's `SheetPopup`, its rows in a `FadeScrollArea`;
  - each row a `Label` around the vendored `Checkbox`, `SerialNo` for serials, list name, ratio and flag in a " · " line, unavailable rows `aria-disabled` and focusable;
  - the any control from `anyControlOf`, the count through `CopyStepper`;
  - Select all and Clear, `EstimatedSerialNote` once, the footer from `dialogFooter`, the confirm from `confirmOf`, dismiss `m.common_modal_cancel()`, `finalFocus` on the tile;
  - below `lg`, full screen with the description `sr-only`, sticky Select all and Clear, 44 px rows, and a one-row footer.

  Add its strings to `en.json`. Verify in the browser, at 1440 px and 390 px:
  - every rule of the interaction spec's section 4 holds at the decided switches;
  - Escape closes only the dialog;
  - Enter on a row does nothing;
  - focus returns to the tile.
- [x] 3.5 Check that `git diff --stat apps/web/src/components/ui/` is empty: nothing vendored is deleted or edited, and the dialog reuses `Dialog`, `Checkbox` and `NumberField` as they are. Verify the command prints nothing.

## 4. Web: the builder column

- [x] 4.1 `builder/draft.ts`, `pickProblem`: "Only N available" compares an any pick's count with `anyTop` over the side's picks and the live item. Extend `draft.test.ts` with the SooMin case (both serials and any × 2 is not blocked) and a shown-only any beside every serial (blocked). Verify with `bun test apps/web/src/features/offers/builder/draft.test.ts`.
- [x] 4.2 `builder/side-column.tsx`: draw `byCollection(picks)`, and make the any note read "Any serial · N available" with N from `anyTop`. `builder/form.tsx` passes the side as shown. `holdsDraft` keeps comparing the unordered picks. Verify in the browser the spec scenarios "Serials picked in one dialog" and "Any card first", and that removing a card moves focus to the next card's remove button.
- [x] 4.3 Prefills, checked by hand on the local stack:
  - a Trade row's matches add the lowest serial where a list names copies;
  - Make offer for this objekt adds #40-style copies;
  - a Market listing opens its copy checked in the dialog;
  - a counter's any-copy ask shows its count, and its give asks show as checked rows;
  - near picks add per copy.

  Record each as checked in this task.

  Checked on 2026-11-13 on the local fixture (localtest1 to localtest2): a row's matches add dohyung-222z #171 and seongjun-211z #593 and ask sunjae-222z as any copy; Make offer for this objekt adds #171 from "lt2 spares" and any serial from "lt2 extras"; the Market listing #593 opens checked in its dialog; a counter shows the give asks as checked rows. A counter by localtest2 of an offer asking two any copies shows them on You give as two checked rows of its own copies (#201, #202) beside #200, "3 of 3 picked". Near picks: with "lt1 idntt wants" set to Swaps only for the check (then restored), the row reads "1 more if you buy: SeongJun Sp26 211Z", and adding it puts #593 on You get as its own copy and opens the top-up.

## 5. Messages in three locales

- [x] 5.1 Translate every key added in groups 3 and 4 into `apps/web/messages/ko.json` (합니다체) and `ja.json` (full-width ？, 。 where the English has a full stop). Reuse the existing renderings of "Any serial" (`시리얼 무관`, `シリアル指定なし`) and "They choose the serial". Verify the three files carry the same key set with a one-line `jq 'keys'` diff, and that `bun run paraglide:compile` succeeds in `apps/web`.

## 6. Docs

- [x] 6.1 `apps/web/docs/offers.md`, Offer builder: replace the `resolveGetAsks` sentence ("an any-copy entry on the ask's list keeps the ask") with the `listedAsAny` rule. Add a short paragraph on the picker: tiles per collection through `copy-groups.ts`, the serial dialog nested in the sheet, confirm replacing only the copies it shows, and pages never splitting a collection. Verify every symbol it names exists (`grep`).

## 7. Checks and close

- [x] 7.1 `bun run check` passes from the repo root (lint, typecheck, test), and `bun run build --filter=web` passes.
- [x] 7.2 Browser pass against the local stack with `browser-use`, following the rules in `~/.claude/CLAUDE.md`: its own tab by target id, and the page hydrated before any login form is submitted. Walk:
  - You get over lists, You give and the collection picker at 1440 px and 390 px, with screen reader names checked through the accessibility tree;
  - one post (Offer on fixed) and across posts (list names on rows);
  - a full side at 50.

  Send is verified up to the request body only and recorded as "read-only verified".

  Walked on 2026-11-13 on the local fixture in isolated contexts: You get over lists, You give and the collection picker (localtest3's collection) at 1440 px and 390 px with accessible names read from the tree; one post and across posts; a full side at 50 on You give and on the collection picker. One offer (O-286) was sent for real on the local database with the user's approval and withdrawn. The pass found two faults, fixed with `anyElsewhere` and rechecked: an any pick held through a list the picker no longer shows was counted by, and cleared with, the narrowed group.
- [x] 7.3 `AGENTS.md`: none of the root, `apps/web/AGENTS.md` or `packages/api/AGENTS.md` changes, since the rules this change alters live in the two `docs/offers.md` files (tasks 2.6 and 6.1). Verify by reading the three files' picker and offer lines: `grep -n "picker\|any copy\|any-copy" AGENTS.md apps/web/AGENTS.md packages/api/AGENTS.md`.
