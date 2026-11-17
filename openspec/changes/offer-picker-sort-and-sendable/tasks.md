# Tasks

**Ground rules for every task:**
- No task commits, pushes, stashes (use a WIP commit if work must be set aside), runs a migration, or writes to any database.
- The root `.env` is production. A production read runs read-only (`PGOPTIONS='-c default_transaction_read_only=on'`) and only with the owner's go-ahead.
- Tests are `bun test` on pure modules only. None touches the database, Redis or Cosmo.
- Each task ends with `bun run lint` and `bun run typecheck` passing for the package it touched (`--filter=@repo/api` or `--filter=web`), and `bun run build --filter=web` building. `@repo/api` has no build of its own, and the web build bundles it.
- "Design N" means decision N in `design.md`.

## 1. A — API (`packages/api`)

- [x] 1.1 **Inputs and cursor.** In `packages/api/src/schemas/offer.ts`:
  - add `PICKER_SORTS = ["default", "collectionNo"] as const` and `type PickerSort`;
  - add `sort: z.enum(PICKER_SORTS).optional()` and `transferableOnly: z.boolean().optional()` to `pickerNarrowingSchema`;
  - add `collectionNoCursorSchema` (design 4: `sort` literal, `no`, `rank` as `z.int32()`, `receivedAt` as `timestampTextSchema`, `slug`) and `candidateCursorSchema = z.union([receivedAtCursorSchema, collectionNoCursorSchema])`;
  - use it for `candidatesInputSchema.cursor`, and make `CandidateCursor` its inferred type. Leave `schemas/common/cursor.ts` untouched.

  Add cases to `schemas/offer.test.ts`:
  - today's input `{ conversationId, side: "mine", cursor: { receivedAt, id } }` parses unchanged;
  - a Collection No. cursor parses with its `slug`;
  - a Collection No. cursor without `sort` fails;
  - `{ receivedAt, slug }` with no `id` fails.

  Verify with `bun test packages/api/src/schemas`.
- [x] 1.2 **Pure sort module.** Write `packages/api/src/lib/picker-sort.ts` and `picker-sort.test.ts`, with these exports (design 2, 4, 5):
  - `UNRANKED`;
  - `memberRanks(artists)`: a `Map` from the lowercased member name to that member's `order`, the last artist winning a clash;
  - `rankOf(ranks, member)`;
  - `cursorFor(sort, cursor)`: the cursor when its kind fits the sort, else `undefined`;
  - `compareCollectionNo(a, b)`: a code-unit compare;
  - `byCollectionNo(items, keyOf)`: a stable sort of grouped items by `[no, rank]`, keeping each collection's items in place.

  The tests pin:
  - 101A < 101Z < 110Z < 201Z;
  - roster order within one number;
  - an unknown member last;
  - a full tie keeping the input order (Atom01 and Binary01 SeoYeon 101Z);
  - a collection's any item staying first;
  - `cursorFor` returning `undefined` for an absent cursor, for a newest cursor under `collectionNo`, and for a Collection No. cursor under `default`, and returning each matching cursor.

  Verify with `bun test packages/api/src/lib/picker-sort.test.ts`.
- [x] 1.3 **Collection columns.** In `packages/api/src/services/offer/core.ts`, add `collectionNo: collections.collectionNo` and `member: collections.member` to `objektColumns` and to `IndexedObjekt` (design 5). Then:
  - in `picker/shared.ts`, `ownedGroupPage`'s final select adds the same two fields (`collections.collectionNo` and `collections.member` through `p`, which `w` now selects), and its `page` map strips the cursor-only fields;
  - confirm that `toCandidate` does not copy the new fields out.

  Verify with `typecheck`, and with a grep showing that `candidateItemSchema` is unchanged.
- [x] 1.4 **SQL fragments, then `ownedGroupPage` under Collection No.** First write `packages/api/src/lib/picker-sort-sql.ts`, importing only `drizzle-orm` and `lib/picker-sort.ts`:
  - `collectionNoOrder(cols)`: the `ORDER BY` list `no COLLATE "C" ASC, rank ASC, received DESC, slug DESC`;
  - `collectionNoAfter(cols, cursor)`: the expanded cursor test of design 3.

  `cols` is `{ no, rank, received, slug }` as `SQL`. Its test, `picker-sort-sql.test.ts`, renders both through `new PgDialect().sqlToQuery` with `sql.raw` columns, as `lib/trade-sql.test.ts` does, and pins the text and the four parameters. Verify with `bun test packages/api/src/lib/picker-sort-sql.test.ts`.

  Then, in `picker/shared.ts`, add a `PickerOrder` parameter to `ownedGroupPage`, `{ sort: "default" } | { sort: "collectionNo"; ranks: MemberRanks }`, defaulting to `default`. Under `default`, the `WHERE`, the window, the `ORDER BY` and the cursor test stay as they are, and only the select list grows (1.3).

  Under `collectionNo`, build (design 3):
  - the roster join in `w`: `unnest` of two array parameters through `sql.param`, built from the `memberRanks` Map's entries so no name repeats, and `coalesce` to `UNRANKED`;
  - `collectionNoOrder` for both the window and the final `orderBy`, the latter followed by `serial` and `id`;
  - `collectionNoAfter` for the cursor;
  - the next cursor `{ sort: "collectionNo", no, rank, receivedAt, slug }`.

  Keep the comment on `g` (aggregated over `objekt` alone). `ownedPage` is untouched.

  Verify with `typecheck`. Then read the diff: the default path's window, `ORDER BY` and cursor test must be unchanged.
- [x] 1.5 **`mineCandidates`** (`picker/mine.ts`):
  - **View.** Compute the view as design 1 describes: `DEFAULT_VIEW` when `objektIds` or `copiesOf` is set.
  - **Cursor.** Normalise the cursor once, `const after = cursorFor(sort, cursor)`. Use `after` everywhere the raw `cursor` is read today, including the have-entries skip (`cursor || fromList !== undefined || …`), so a mismatched cursor reads as page one throughout.
  - **Roster.** Under `collectionNo`, add `getArtists()` to the first `Promise.all`, then call `memberRanks`.
  - **Page.** The call site picks `ownedPage` for `objektIds` and `ownedGroupPage` otherwise. Pass `order` to `ownedGroupPage` only; `ownedPage` keeps its signature. Under `transferableOnly`, add `eq(objekts.transferable, true)` to the page's `where` and to `narrow`, which the have-list reads use.
  - **Suggested.** Under `collectionNo`, sort `ordered` with `byCollectionNo`, keyed by each objekt's `collectionNo` and `rankOf(member)`, before `pageByCollection`. Under the default, it keeps entry order.

  Verify with `typecheck`. Then read the diff: an input without the new fields takes exactly today's branches.
- [x] 1.6 **`theirCollectionPage` and `theirPickerPage`** (`picker/theirs.ts`):
  - **Collection page.** Under `collectionNo`, read the roster beside `partnerHasLists`. Pass `order`, `cursorFor`, and the transferable `where` to `ownedGroupPage`. Filter `keptCollections`' copies by `transferable` under the switch, and leave `keptSlugs` as it is (design 6).
  - **Picker page.** Run `getArtists()` beside `resolveTheirItems` under `collectionNo`. Under the switch, drop items with `objektId !== null && !transferable` before the wanted narrowing. Replace `filterSlugs` with `collectionKeysOf(slugs, filters)`, which returns `Map<slug, { no, member }>` and runs when filters are set or the sort is `collectionNo`. Under `collectionNo`, apply `byCollectionNo` after `orderByCollection` and before `pageByCollection`.
  - **Callers.** Point `keptObjekts`' use of `filterSlugs` at the new function.
  - **`sidePage`** (`picker/index.ts`): the whole theirs list (no `offset`) passes no view.

  Verify with `typecheck`, and with `bun test packages/api` green.
- [ ] 1.7 **Read-only plan check.** Only with the owner's go-ahead for a production read. Run `EXPLAIN (ANALYZE, BUFFERS)` on the indexer with `PGOPTIONS='-c default_transaction_read_only=on'` for the largest holder's grouped page, three times:
  - default;
  - `collectionNo`;
  - `collectionNo` with `transferableOnly`.

  Record in this task the times, and confirm that `g` still uses the owner index and that no plan gains a sequential scan of `objekt`. Without a go-ahead, write "skipped: no approval" here. Design 3 then stands on reasoning alone.

  skipped: no approval
- [x] 1.8 **API docs.** In `packages/api/docs/offers.md` (Offer get sources, the picker-paging sentence), add:
  - the picker's `sort` and `transferableOnly`, and that only the three grid reads honour them;
  - the Collection No. key and its tie-break, with `lib/picker-sort.ts`;
  - the cursor union, and why the new cursor names `slug`;
  - that the switch sits in `where`, before the window sum.

  Verify by reading it back against design 1 to 6, and with `bun run lint --filter=@repo/api`, `bun run typecheck --filter=@repo/api` and `bun run build --filter=web` passing.

## 2. B — Web (`apps/web`)

Load `vercel-react-best-practices` before editing any `.tsx`, as the hook requires, and `vercel-composition-patterns` for the `PickerSwitch` change.

- [x] 2.1 **Store.**
  - In `apps/web/src/stores/settings.ts`, add `offerPickerSort: PickerSort` (default `"default"`, the type imported from `@repo/api/schemas/offer`) and `offerPickerHideUntransferable: boolean` (default `false`), each with a one-line doc comment.
  - In `stores/legacy-storage.ts`, wrap `seededStorage`'s `setItem` in `try/catch`. Add a one-line comment: zustand's `persist` does not catch a throwing `setItem`, and the in-memory value must stand (design 7).

  Verify with `typecheck`. Then, in the browser check (2.6), with `localStorage.setItem` stubbed to throw, the switch still toggles.
- [x] 2.2 **Pure view module.** Write `apps/web/src/features/offers/picker-view.ts` and `picker-view.test.ts`:
  - `type PickerView = { sort: PickerSort; hideUntransferable: boolean }`;
  - `viewInput(view)`: only the non-default fields, as `sort` and `transferableOnly`;
  - `viewActiveCount(view)`: 1 while the switch is on, never for sort;
  - `emptyReason(filters, view, matchLocked)`: the precedence of design 7, rows 2 to 6, returning a tag (`"filtered" | "match" | "hide" | "plain"`) plus whether Turn off shows.

  The tests cover every row, the locked match with the switch on (`"filtered"`), and `viewInput` of the default view being `{}`. Verify with `bun test apps/web/src/features/offers/picker-view.test.ts`.
- [x] 2.3 **Query options.** In `features/offers/queries.ts`, give `theirPickerOptions`, `cursorOptions`, `myCandidatesOptions` and `theirCollectionOptions` a `view: PickerView` parameter, and spread `viewInput(view)` into each input. Leave `theirCandidatesOptions`, `myAskCopiesOptions` and `myObjektsOptions` alone. Verify with `typecheck`. In the browser check, a default picker's request body must hold no `sort` or `transferableOnly`.
- [x] 2.4 **Controls and empty lines.** In `features/offers/offer-picker-grids.tsx`:
  - **Switches.** Generalise `MatchSwitch` into `PickerSwitch`, with the same markup.
  - **`PickerGrid`.** Read the view from `useSettings` with one selector per field. Render after the match switch:
    - a `SingleSelect` (`label: m.filter_sort_by_label()`, `defaultValue: "default"`, `showValue`) whose options are `{ value: "default", label: defaultSortLabel }` and `{ value: "collectionNo", label: m.filter_sort_by_collection_no_label() }`;
    - a `PickerSwitch` labelled `m.offer_picker_hide_untransferable()`.

    Both write through `useSettings`' `set`. Add `viewActiveCount(view)` to `extraActive`.
  - **Grids.** `MineGrid` and `TheirCollectionGrid` pass `defaultSortLabel = m.offer_picker_sort_newest()`, and `TheirsGrid` passes `m.offer_picker_sort_list()`. Each passes the view to its query options.
  - **Empty lines.** Replace `narrowedEmpty` and the `narrowed` checks with `emptyReason`. `"hide"` maps to `m.offer_picker_none_transferable()` with a Turn off button (`m.offer_picker_match_off()`) that sets `offerPickerHideUntransferable: false`. `theirsEmpty` keeps "not listed" first.

  Verify with `typecheck`, `lint` (the React Compiler rules included) and `bun run build --filter=web`.
- [x] 2.5 **Messages.** Add the four keys of design 8 to `apps/web/messages/en.json`, `ko.json` and `ja.json`, beside the other `offer_picker_*` keys, with the exact text of the table. Verify with `bun run paraglide:compile` from `apps/web`, followed by `typecheck`.
- [ ] 2.6 **Browser check.** Use the `browser-testing-with-devtools` skill and the `browser-use` CLI. The brief for this run carries the browser rules:
  - drive the automation Chrome on `BU_CDP_URL=http://127.0.0.1:9333` (start it as `~/.claude/CLAUDE.md` says if `curl -s http://127.0.0.1:9333/json/version` fails), never the everyday one;
  - open a tab of your own and drive it by target id;
  - for a signed-out pass, use an isolated context;
  - wait for hydration before submitting a sign-in form;
  - read the `SMOKE_TEST1_*` credentials from the env only, never print them, and delete any log that leaks one and tell the owner.

  Run `bun run dev --filter=web`, sign in, and open `/trade/@<handle>/offer` for a partner with a post. Then check, read-only (Send and Done are never chosen):
  - **Defaults.** Sort reads "Sort by · Newest received" in You give and "Sort by · List order" in You get. Requests carry neither new field.
  - **Collection No.** It reorders by number, then roster, and the next page continues the order.
  - **The switch.** It removes not-transferable copies and empty tiles. A reserved copy keeps "In a trade in progress".
  - **Remembered.** The choice holds after closing the sheet, opening the other side and reloading.
  - **Reset.** It leaves both controls.
  - **Reload with remembered values.** With both controls off their defaults, reload the offer page: the console shows no hydration warning, and the pickers open with the remembered values.
  - **Phone.** At 390 px, the badge counts the switch and not Sort.
  - **Empty.** The empty line and Turn off work when the switch empties a list.
  - **Blocked storage.** With `localStorage.setItem` stubbed to throw, the controls still work.
  - **Languages.** The ko and ja labels fit the bar.
  - **Collection picker.** If no partner with no lists and collection asks on is at hand, say so here instead of inventing one. Creating test data needs the owner's approval.

  Record what was checked in this task.

  **Run record (2026-11-18, dev server on :3200, already-signed-in local session, partner `0x10ca…0001` over list `lt1doubles`; also `0x000b…d286` over `p have`).** Read-only: no Send, Done or Accept. Not ticked: two lines are NOT CHECKED.
  - PASS Defaults: "Sort by · Newest received" (You give), "Sort by · List order" (You get); candidates bodies carry neither `sort` nor `transferableOnly` and keep the old `{receivedAt,id}` cursor.
  - PASS Collection No.: body gains `"sort":"collectionNo"`; order runs 100Z, 102A, 103Z ... 501Z across pages, the next page sends `cursor:{sort:"collectionNo",no,rank,receivedAt,slug}`. The two sections ("From your have lists", then all) each sort; the same objekt appears in both sections under the default sort too (not new).
  - PASS Switch: body gains `transferableOnly:true`; 0 "Not transferable" tiles and the "None available" tile gone. A reserved copy (ChaeWon C2 104Z, You get) keeps "In a trade in progress" with the switch on.
  - PASS Remembered: sort and switch held across closing the sheet, opening the other side, and a reload (`web:settings` holds `offerPickerSort`, `offerPickerHideUntransferable`).
  - PASS Reset: with Collection No. + switch on and a search set, Reset cleared the search and left both.
  - PASS Reload with non-default values: no hydration warning (only a benign ResizeObserver note and a font-preload warning); pickers open with the remembered values.
  - PASS Phone 390 px: Filters badge reads 1 with the switch on and none with only Sort non-default.
  - PASS Empty: `p have` with the switch on shows "Nothing transferable to show" with Turn off; Turn off clears the switch and refetches without `transferableOnly`. Under a search, the empty line reads "Nothing matches these filters" and with Only what they want on too (rows 2 and 5).
  - PASS Blocked storage: with `Storage.prototype.setItem` throwing, the switch and the Sort both change and the request bodies follow; no console error.
  - PASS Languages: ko ("정렬 기준 · 컬렉션 번호", "전송 불가 숨기기") and ja ("並び替え · コレクションNo.", "送付できないものを隠す") fit the bar at 1800 and 390 px (ko wraps the switch to a second row on desktop; no clipping).
  - NOT CHECKED Locked match + switch empties the list ("filtered" reading): no empty case arose under the locked match.
  - NOT CHECKED Collection picker (no lists, collection asks on): no such partner on the local feed; no data created.
  - Not driven: second page of the You get side (only 3 entries).
  - Left as found: localStorage settings reset to defaults, locale cookie `en`, dev server stopped, tab closed. Screenshots: `/private/tmp/claude-501/-Users-shahredza-Developer-lunar-cosmo-web-original/d49a689b-4064-47f1-9c70-8d3f1a7d628d/scratchpad/browser-check/`.
- [x] 2.7 **Docs and checks.**
  - In `apps/web/docs/offers.md`, under Offer builder, add a sentence on the picker view: `useSettings`, shared by the three grids, outside `Filters` so Reset leaves it; `viewInput` sends only non-defaults; `emptyReason`'s order.
  - Root `AGENTS.md`, `apps/web/AGENTS.md` and `packages/api/AGENTS.md`: no convention, trap or workflow changes. Write "none changed" here unless the work found one.
  - Run `bun run check` from the root; it passes (lint, typecheck and test for every package). Run `bun run build --filter=web`; it builds.

  None changed.
