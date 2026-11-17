# Design

## Context

See proposal.md (Why) and the delta spec for the behaviour. The current state that shapes the approach:

- **Three picker reads, two paging styles.** All go through `offer.candidates` (`routers/offer.ts`, `/rpc` only, never mounted in `openApiRouter`).
  - **You give** (`side: "mine"`, `mineCandidates`, `picker/mine.ts`) pages with a cursor through `ownedGroupPage` (`picker/shared.ts`). Collections come newest-received first: each group's `max(received_at)` desc, then slug desc. The cursor is `{ receivedAt, id }`, where `id` holds the slug. Page one also carries `suggested`, the have-list copies in entry order (`orderByCollection`), cut by `pageByCollection`.
  - **The collection picker** (`side: "theirs-collection"`, `theirCollectionPage`, `picker/theirs.ts`) uses `ownedGroupPage` in the same way. The countered offer's collections (`keptCollections`) lead page one.
  - **You get over lists** (`side: "theirs"` with `offset`, `theirPickerPage`) resolves the whole list in memory (`resolveTheirItems`), then filters, orders it with `orderByCollection` (first-seen order, i.e. the list order: `allowedEntries` orders by `list_id, entry id`), and cuts it with `pageByCollection` by offset. **Its order today is list order, not newest received.**
- **Reads that are not grids.** These share the same procedure: the whole theirs list without `offset`, which the builder checks picks against; `objektIds`, a counter's give flags through `ownedPage`; and `copiesOf`, a counter's any-copy stand-ins. `offer.suggest` is separate.
- **The app's Collection No. sort** is `sortObjekts` (`apps/web/src/features/filters/filter-utils.ts`, pinned by `filter-utils.test.ts`, "collection number sorts by number, then member"). The keys run collection number (`Intl.Collator` compare), then member by `compareMember` (`features/artist/use-cosmo-artist.ts`: each member's `order` inside its artist, an unknown member last). Season, artist and class are not keys. A full tie keeps the input order, since the sort is stable. Its default direction is ascending (`SORT_DEFAULT_DIR`). The roster comes from `config.getArtists`, which the server reads through `getArtists()` (`services/artist.ts`, `getStaleCache`). No indexer column holds roster order.
- **Indexer.** `collection` has a btree on `collection_no`. `objekt` has `(owner, collection_id)`, `(owner, received_at desc, id desc)` and `(collection_id, owner)`, and none includes `transferable` (`packages/db/src/indexer/schema.ts`).
- **Picker state** in `offer-picker-grids.tsx`: each grid holds `Filters` (facets, search, `matchOnly`) in `useState`. `PickerFilterBar` counts facets plus `extraActive` for the phone badge, and its Reset sets `NO_PICKER_FILTERS`, which leaves `matchOnly` alone. `narrowedEmpty` picks the empty line.

## Goals / Non-Goals

**Goals:**
- Collection No. in the pickers orders exactly as the profile grid does at its default direction, on the server, so paging stays by collection and no page comes back short.
- Hide not transferable narrows on the server before the window sum, so counts and pages agree.
- Every input an open tab sends today validates and returns what it returns today.

**Non-Goals:**
- Any change to `ownedPage`'s order, the whole theirs list, `objektIds`, `copiesOf` or `offer.suggest`. None of them is a grid.

**Boundary:** the worker imports no `services/offer/picker/` module (`grep -r '@repo/api/services' apps/worker/src`), so calling `getArtists()`, which reaches `services/redis`, from the picker keeps the worker's import chain clear.

## Decisions

### 1. Inputs: two optional fields on the picker narrowing

`pickerNarrowingSchema` (`schemas/offer.ts`) gains two fields:
- `sort: z.enum(PICKER_SORTS).optional()`, with `PICKER_SORTS = ["default", "collectionNo"] as const` exported beside it, since the web imports `schemas/` and not `lib/`;
- `transferableOnly: z.boolean().optional()`.

An absent field means `"default"` and `false`, which is today's read on every side. `"default"` names "this picker's own order" (newest received, or list order) rather than "newest", so one value fits all three pickers.

- **What an open tab sends after the deploy:** neither field, and a `{ receivedAt, id }` cursor. Both validate and read as today (decision 4).
- **Where the fields count:** only in the three grid reads: `mine` without `objektIds` and `copiesOf`, `theirs-collection`, and `theirs` with an `offset`. `mineCandidates` reads them as `const view = objektIds || copiesOf ? DEFAULT_VIEW : { sort, transferableOnly }`, and the whole theirs list never receives them (`theirCandidates` takes no narrowing). Those reads resolve existing picks and their flags. Filtering or reordering them would hide flags the builder needs.
- **The web sends a field only when it is not the default.** Default reads keep today's exact input and cache key.

Alternative refused: a separate procedure for sorted pages. It would duplicate the side routing and the rate limit for two flags.

### 2. Collection No. order and its tie-breaks

The key, the same in SQL and in memory:

1. `collection_no` ascending, compared by code unit (`COLLATE "C"` in SQL; `<` on the strings in TypeScript). Collection numbers are digits followed by one capital letter (`bareNo` in `schemas/list-rule.ts` assumes this). On that alphabet the code-unit order equals the grid's `Intl.Collator` order: 101A < 101Z < 110Z < 201Z. Pinning `"C"` keeps the database's own collation out of it.
2. The member's rank, ascending: the `order` of the member inside its artist, from `getArtists()`, keyed by the lowercased name, the last artist winning a clash, as `memberMap` in `cosmo-artist-provider.tsx` builds it. A member missing from the roster gets `UNRANKED = 2_147_483_647`, so it sorts last, as `compareMember` puts it. Two artists' members with the same `order` tie here, as in the grid.
3. A full tie keeps the picker's default order, as the grid's stable sort keeps its input order:
   - in `ownedGroupPage`: group `received` desc, then slug desc;
   - in memory: the order the list or the have entries give.

Artist, season and class are not keys, because the grid uses none of them: Atom01 and Binary01 SeoYeon 101Z fall to rule 3.

The roster is one `getArtists()` call. It reads through Redis, and only under `collectionNo`, so the default read costs nothing new. It starts in the side's first `Promise.all`: beside `linkedAddresses` in `mineCandidates`, beside `partnerHasLists` in `theirCollectionPage`, and beside `resolveTheirItems` in `theirPickerPage`. The rank map is built by a pure `memberRanks(artists)`.

Alternatives refused:
- **Ties by slug, no roster.** This would skip the Redis read, but it orders members alphabetically, which breaks "same as the profile grid" for every number every member shares.
- **Season as a key.** The grid doesn't use it, and the requirement is to mirror the grid.
- **A direction toggle.** It is out of scope (proposal). `collectionNo` reads in the grid's default direction only.

### 3. `ownedGroupPage` under Collection No.

`ownedGroupPage` gains `order: PickerOrder`: `{ sort: "default" } | { sort: "collectionNo", ranks: MemberRanks }`. Under the default, the statement keeps today's `WHERE`, window, `ORDER BY` and cursor test, and returns the same rows in the same order; only the select list grows by the two columns of decision 5. Under `collectionNo`:

- **The roster join.** `w` left-joins the roster as `unnest(${names}::text[], ${ranks}::int[]) AS r(name, rank)` on `r.name = lower(collection.member)`, with each array bound as one parameter (`sql.param`), as `reservedIds` binds its ids. The two arrays come from the `memberRanks` Map's entries, so each name appears once: a repeated name would join a collection twice and break the window sum. `w` selects `no: collection.collection_no` and `rank: coalesce(r.rank, UNRANKED)`.
- **The window.** It orders by `collection_no COLLATE "C" ASC, rank ASC, received DESC, slug DESC`. The final `ORDER BY` uses the same keys, then `serial`, `id`.
- **The cursor test** has mixed directions, so it is spelled out instead of a row comparison:
  `no >C c.no OR (no = c.no AND (rank > c.rank OR (rank = c.rank AND (received, slug) < (c.receivedAt::timestamptz, c.slug::text))))`.
  It is built once as `collectionNoAfter(cols, cursor)`, beside the key list `collectionNoOrder(cols)`, in a client-free module `lib/picker-sort-sql.ts`. Each takes its columns as `SQL` (`{ no, rank, received, slug }`), so the window, the final order and the cursor cannot drift apart. `picker-sort-sql.test.ts` renders them through `PgDialect().sqlToQuery`, as `trade-sql.test.ts` does, with no database client.
- **The next cursor.** The final select adds `p.no` and `p.rank`, and the last row's `{ sort: "collectionNo", no, rank, receivedAt: groupReceivedAt, slug }` is returned.

**Cost.** `g` still aggregates the owner's `objekt` rows over `(owner, collection_id)` and reads the heap for `received_at`, as today. The new key orders the owner's groups after aggregation, and so does today's `max(received_at)`. Neither can use an index, and both sort the same few thousand groups. The roster join is a hash join over about 100 rows. No new index and no migration. Task 1.7 confirms this with a read-only `EXPLAIN (ANALYZE, BUFFERS)` on the largest holder, with the owner's go-ahead.

`ownedPage` is unchanged. It serves only the `objektIds` read, which is one page by construction (`OFFER_SIDE_LIMIT <= CANDIDATE_PAGE_SIZE`), and it ignores `sort`.

### 4. Cursor shape and a cursor from the other sort

The candidates cursor becomes `candidateCursorSchema = z.union([receivedAtCursorSchema, collectionNoCursorSchema])` in `schemas/offer.ts`. `collectionNoCursorSchema` is `{ sort: z.literal("collectionNo"), no: z.string().min(1).max(10), rank: z.int32(), receivedAt: timestampTextSchema, slug: z.string() }`. The shared `receivedAtCursorSchema` (also used by `schemas/objekts.ts`) is untouched, and `CandidateCursor` becomes the union's type.

- **The new cursor names its slug `slug`, not `id`.** A Collection No. cursor then fails the newest branch, which requires `id`, so `z.object`'s key stripping cannot read one as the other. On a rollback, a tab on the new build that sends it gets a validation error on Load more instead of a silently wrong page.
- **A pure `cursorFor(sort, cursor)`** (`lib/picker-sort.ts`) returns the cursor only when its kind matches the sort, else `undefined`. A mismatch never reaches a `::timestamptz` cast or a key it lacks. It reads as the first page, never an error. The web cannot send a mismatch: the sort is part of the query key, so changing it starts a fresh query. Only a crafted request can, and it gets page one.
- **On a rollback, an old server** strips `sort` and `transferableOnly` and serves today's pages. Its picker shows the default order and shows every copy, which is safe.

### 5. Collection No. in the in-memory sorts

A pure `byCollectionNo(items, keyOf)` in `lib/picker-sort.ts` stably sorts items that `orderByCollection` has already grouped. It sorts groups by `[no, rank]`, so a collection's items keep their places and its any item stays first. It runs before every `pageByCollection` cut:

- **`theirPickerPage`.** The keys come from one indexer read of the shown slugs. `filterSlugs` becomes `collectionKeysOf(slugs, filters)` and returns `Map<slug, { no, member }>` for the slugs that pass the filters. It runs when filters are set, as today, or when the sort is `collectionNo`. The two cases share the one read, at the place `filterSlugs` runs now, so no new round trip runs under the default.
- **`mineCandidates`' `suggested`.** `objektColumns` (`services/offer/core.ts`) gains `collectionNo` and `member`, read from the `collection` row that every reader already joins, and `IndexedObjekt` gains both. Have-list copies then carry their keys with no extra read. `toCandidate` does not copy them out, so the response is unchanged. The group page selects the two columns too, which keeps its rows `IndexedObjekt`.
- **`theirCollectionPage`.** `keptCollections` still leads page one in its current order, and the paged rest follows the sort. A counter is about those collections.

### 6. Hide not transferable: where the filter sits

The filter is `eq(objekts.transferable, true)`, applied on the server so pages and counts are never short:

| Read | Where |
| --- | --- |
| `mineCandidates` page | joins `where` (beside `fromWhere`), so it sits in `mine` and therefore in `g`, before the window sum, and in the final join |
| `mineCandidates` suggested | joins `narrow` for `fetchObjekts` / `fetchCopies` |
| `theirCollectionPage` page | the `where` of its `ownedGroupPage` call |
| `theirCollectionPage` kept | `keptCollections` drops untransferable copies. `keptSlugs` still excludes those collections from every page, so a kept collection with none left simply vanishes |
| `theirPickerPage` | after `resolveTheirItems`, before the wanted and facet narrowing: drop items with `objektId !== null && !transferable` |

`resolveTheirItems` itself is unchanged, so the any item is still computed over every copy. `anyCopyItem` (`lib/offer-any-item.ts`) counts only transferable, unreserved spares, and it returns null when none is left. An any item is therefore never a non-transferable copy, and it stays. Reserved copies and copies in another open offer pass the filter, keeping their flags.

`listed` and `partnerLists` come from the unfiltered entries, so "hasn't listed anything" still wins. `tags` and `collections` are read over what is returned, as today. Grouping on the web (`groupItems`, `tileOf`) needs no change: a tile groups the items it is given, so its lines, its "can't be offered" count and the serial dialog's rows already cover only the shown copies. A collection with no item has no tile.

A pick of a hidden copy, made before or outside the picker, stays. `PickerBody` (`offer-picker.tsx`) seeds its selection from every pick the side holds and Done returns the whole selection, so the footer's `totalOf(selection)` counts it and Done keeps it whether or not a tile shows it. `applyGroup` replaces only the copies a group shows. The builder still marks a not-transferable pick (Picks that can't be sent).

### 7. Web: query input, controls and the remembered view

- **State lives in `useSettings`** (`stores/settings.ts`), not in each grid's `Filters`. Two fields join it: `offerPickerSort: PickerSort` (default `"default"`) and `offerPickerHideUntransferable: boolean` (default `false`).
  - `useSettings` is the existing persisted store of device choices, with `myPostsShown` as the precedent for a remembered UI choice. A new store would add a second storage key for two values.
  - One value is shared by all three pickers, as the spec says.
  - Because the view sits outside `Filters`, Reset (`NO_PICKER_FILTERS`) leaves it alone without new code.
- **Storage failures.** zustand's `persist` catches a failing `getStorage` and a failing `getItem`, but not a throwing `setItem` (zustand 5 `persistImpl` calls `storage.setItem` bare). `seededStorage` (`stores/legacy-storage.ts`) wraps its `setItem` in `try/catch`, so the in-memory value stands for the page's life. That covers every settings write.
- **No hydration risk.** `OfferPicker` renders `PickerBody` inside `SheetPopup`, which mounts only while the sheet is open, and the sheet opens only on a click: no URL opens it. Neither value is read during SSR or the hydration render. Task 2.6 reloads with non-default values to confirm no hydration warning.
- **Query options.** `myCandidatesOptions`, `theirPickerOptions` and `theirCollectionOptions` take a `view: PickerView`. A pure `viewInput(view)` (`features/offers/picker-view.ts`) returns `{ sort: "collectionNo" }` and `{ transferableOnly: true }` only when set, so a default read sends today's input. The oRPC key includes the input, so a change restarts paging from page one (offset 0, or no cursor) and keeps the picks, which live in the sheet's selection.
- **Controls.** These go in `PickerGrid`'s children, after `MatchSwitch`:
  - a `SingleSelect` labelled `m.filter_sort_by_label()`, with `defaultValue: "default"` and `showValue`, so the trigger always names the order ("Sort by · Newest received");
  - a switch labelled `m.offer_picker_hide_untransferable()`.

  `MatchSwitch` becomes a generic `PickerSwitch` used for both switches. Each grid passes its default label: `offer_picker_sort_newest` in `MineGrid` and `TheirCollectionGrid`, `offer_picker_sort_list` in `TheirsGrid`.
- **Phone badge.** `extraActive` adds 1 while the switch is on. Sort never counts, because it hides nothing. The badge says something is narrowed, and a remembered sort would otherwise light it forever. The page filter bar's sort chip (`use-active-chips.ts`) is a different surface, with no fold.
- **Empty line.** A pure `emptyReason(filters, view, matchLocked)` in `picker-view.ts` replaces `narrowedEmpty`'s branching. It returns the first that applies, in this order:
  1. *(You get over lists, before calling it)* not listed: `offer_picker_theirs_none_listed`, as today;
  2. a search or a facet is set: `offer_picker_filtered`;
  3. match on (locked or not) and hide off: the side's match title, plus Turn off unless locked, as today;
  4. hide on and match off: `offer_picker_none_transferable` with Turn off (`offer_picker_match_off`), which sets `offerPickerHideUntransferable: false`;
  5. match on and hide on: `offer_picker_filtered`;
  6. none: the side's plain empty line, as today, `fromList`'s line included.

  Under the locked match, a hide-emptied picker reads `offer_picker_filtered`. Neither single cause is certain then.

### 8. Copy (Paraglide)

New keys in `messages/{en,ko,ja}.json`. Korean statements use 합니다체. Japanese ends with 。 only where English ends with a period; these empty titles and labels have none.

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `offer_picker_sort_newest` | Newest received | 최근 받은 순 | 受け取りが新しい順 |
| `offer_picker_sort_list` | List order | 목록 순서 | リストの順番 |
| `offer_picker_hide_untransferable` | Hide not transferable | 전송 불가 숨기기 | 送付できないものを隠す |
| `offer_picker_none_transferable` | Nothing transferable to show | 표시할 전송 가능한 오브젝트가 없습니다 | 表示できる送付可能なObjektはありません |

Reused as they are:
- `filter_sort_by_label` (Sort by / 정렬 기준 / 並び替え);
- `filter_sort_by_collection_no_label` (Collection No. / 컬렉션 번호 / コレクションNo.), the profile grid's wording;
- `offer_picker_match_off` (Turn off);
- `offer_picker_filtered`.

The spec calls the option "Collection No." for that reason.

## Risks / Trade-offs

- **The roster changes between two pages** (a member added to Cosmo): ranks shift, and the next page can repeat or skip a collection that shares a number with that member. → Rare, and limited to one number's run. The cursor stores the rank, so it fails safe rather than throwing.
- **A collection number outside `[0-9A-Z]`** would order by code unit on the server but by locale in the profile grid. → No such number exists today (`bareNo`'s assumption). `picker-sort.test.ts` pins the code-unit rule, so a change is deliberate.
- **Redis down under `collectionNo`.** `getArtists` falls back to its snapshot (`data/artists.json`), so ranks still exist. A member newer than the snapshot sorts last.
- **A hidden pick confuses** ("I picked #9, where is it?"). → The footer still counts it, and the builder marks it. This is the same as a pick from another post today.
- **Rollback mid-scroll.** A tab on the new build sending a Collection No. cursor to an old server gets a validation error on Load more. → Visible, retried by reopening, and only during a rollback.

## Migration Plan

No migration, and no deploy order: the web and the API ship together in the web image, and the worker runs none of this. Rollback is the previous image. Decision 4 says what an open tab sees either way.

## Open Questions

- **For the owner: the default label of You get over lists.** The brief calls the default "Newest received (today's order)". You get over lists is ordered by the post's list today, not by received date. This design keeps today's order there and labels it "List order", which is what the spec says. That order is the order entries were added (`allowedEntries`: list id, then entry id), which may differ from the order the list page shows under its own sort, so the owner should confirm the label as well as the order. If the owner wants "Newest received" in that picker too, these change:
  - the spec's "Sort in the pickers" text and two scenarios;
  - `theirPickerPage`'s default order, which would sort the resolved items by each collection's newest `receivedAt`, a key `resolveTheirItems` has on every copy but not on an any item whose copies are all hidden;
  - task 2.4's label.

  Nothing else changes.
