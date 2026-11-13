# Design

See `proposal.md` for why. The behaviour is in `specs/web-trade-offers/spec.md`. The interaction design the owner approved through a mock fixes the copy, the tile states and the dialog's rules, with its three switches set to Both pickers, Pick at once and Offered.

## Context

**Reads.** `offer.candidates` (`services/offer/picker/index.ts`) serves three pickers. Each returns `CandidatesPage` with a flat `items: CandidateItem[]`, one item per copy plus at most one any-copy item (`objektId: null`) per collection.

- **You get over lists** (`side: "theirs"`): `resolveTheirItems` (`picker/theirs.ts`) resolves every allowed entry against the partner's wallet on each request. The builder's own read (no `offset`) takes the whole list, to check picks against it and to carry `partnerRules` and `lists`. The picker (`theirPickerPage`) narrows that same list and slices it by `offset`, `CANDIDATE_PAGE_SIZE` (200) items at a time. Items come in entry order (list id, entry id), so one collection's copies can sit on either side of a slice.
- **You give** (`side: "mine"`, `mineCandidates`) and **You get over a collection** (`side: "theirs-collection"`, `theirCollectionPage`) page in the database through `ownedPage` (`picker/shared.ts`): newest received first, 200 objekts after a `{ receivedAt, id }` cursor. A collection's copies land on whichever pages their receive times put them. You give's first page also carries `suggested`, the have-list copies (up to 200). The collection picker's first page leads with a counter's kept objekts.

**Any copy today.** An any-copy ask fits only an entry with `entryObjektId(entry) === null`: an entry for the whole collection, or any entry on a list that hides serials (`entriesFitting`, `lib/offer-rules.ts`). `anyCopyScope` turns entries into the copies such an ask may draw on: null (every copy) with a whole-collection entry, else the tokens hidden-serial entries name. `resolveTheirItems` emits the any item with `copies` (the spare copies in scope, less open any-copy legs) and `bySerial` (a whole-collection entry on a list that shows serials). At send, `checkItems` (`services/offer/items.ts`) counts the copies an any ask may take: transferable, unreserved, inside `getScope` (cut to the chosen post's entries) and never a copy the same offer names by serial. Accept calls `checkItems` with no `getScope`. An any-copy leg has `objekt_id` null, and the verifier takes any copy of its collection the giver sends (`lib/trade-match.ts`). Nothing at accept chooses a copy.

**Web.** `OfferPicker` (`offer-picker.tsx`) holds a working selection, `Map<pickKey, OfferPick>`, and hands it to the grids through `PickerSelectionContext`. `CandidateGrid` draws a `VirtualCardGrid` of `CandidateTile`s, one per item. An any item's − / + count is `CopyStepper` (vendored `NumberField`). Its top is `copiesLeft` (`quantity.ts`): `copies` less the copies of that collection the side names by serial. Done writes the selection to the builder. The builder's `pickProblem` (`builder/draft.ts`) marks a get pick "Not on their lists" when the whole theirs list lacks its key, and "Only N available" past `copiesLeft`.

**Prefills.** These build `OfferPick`s outside the picker, one per copy or one any-copy pick:

- `suggestOffer` and `nearPicks` → `itemsOnLists`, then `chooseMatchPicks` / `getChoice` (`lib/offer-prefill.ts`), which takes the any item first when one exists;
- `nearPicks`;
- `resolveGetAsks` (Make offer for one objekt of a post), which keeps an any ask when the list has an any item;
- the Market listing link;
- `counterRequest`.

## Goals / Non-Goals

**Goals:**

- Every decision below keeps the offer request (`createOfferInputSchema`), the candidates input and the stored offer unchanged.
- Grouping and the dialog's rules live in pure modules beside their tests. The components only draw them.
- The server's count rule stays one rule for every list kind. "Worth one copy" is a rule of the picker, not of the server.

**Non-Goals:**

- Changing what accept counts or what the verifier takes for an any-copy leg.
- A new endpoint or a per-collection read. The dialog draws from the page already loaded.
- Restyling the builder's cards or the sheet.

## Decisions

### a. Reach of Any serial

An any ask SHALL fit every entry of its collection on the partner's allowed lists. That now includes an entry on a list that shows serials and names one copy.

- `entriesFitting`: for `item.objektId === undefined`, every entry of the collection fits.
- `anyCopyScope`: a token any entry names joins the scope, whatever the list hides. A whole-collection entry still makes it null.

What the server accepts and refuses after the change:

- **Copies drawn on.** An any ask draws on the copies the entries open: every copy with a whole-collection entry, else the tokens named on any list. The partner must still hold them, transferable and unreserved, less open any-copy legs.
- **Count rule.** Unchanged: `checkItems` still leaves out copies the same offer names by serial, so "Any serial" beside every shown serial is refused `not_owned` naming the collection (spec scenario "Any serial beside every serial").
- **Serials from the same collection.** They combine with any asks freely, within that count. No new code: `named.has(copy.id)` in `checkItems` already does it.
- **One post.** `getScope` is already cut to the chosen list's entries, so a one-post offer's any ask draws only on that post's copies. The widened `entriesFitting` also widens an any ask's `candidates` in `onePostVerdict`: a list that names the collection's copies by serial now carries it too. In the web flow a one-post partner always gets a named `post`, so nothing the picker sends changes. A request with no `post` (the API, or a stale tab) that pairs an any ask with a serial only on "spares" now fits "spares" and is sent on it, its any ask scoped to "spares"' copies, where before it was refused `other_post`. An any ask that names its list (`listSlug`, as the picker sends it) stays a candidate of that list alone (`askCandidates`, `lib/offer-recipient-rules.ts`): otherwise a shown serial on "spares" beside two any copies picked from "extras" would settle on "spares", cut the any ask to the one copy already asked for by serial, and be refused `not_owned` for a recipient who takes asks across posts (found by the request checks of task 2.3). For a recipient who takes asks across posts, any asks that need more copies than the settled list names (`anyAsksFit`) put the offer on no one post, drawing on every list: the picker's any item counts a collection's copies over all lists, so three any copies of a collection held two on one hidden-serial list and one on another were refused `not_owned` (found after the change shipped, and older than it). With the switch off the ask stays cut to the one post. The recipient switches are unchanged. This is the one place their outcome moves, and only toward a request every list involved allows.
- **Accept.** Accept and the verifier are unchanged. Accept counts the giver's copies of the collection, and the giver sends whichever copy they choose, as for a hidden list's any copy today.
- **A single shown copy.** The server accepts an any ask for it (any serial of one copy is that copy), but the picker never offers it. The tile picks the copy at once (decision 2).

Rejected: a scope of its own for shown-only collections, used only when no hidden or whole entry exists. It keeps two rules where one does, and gives the same answers for every request the picker sends.

### a2. The any item says how many copies only Any serial reaches

The any item gains one field, `hidden`. It counts the copies, of `copies`, that no copy shown by serial in the same read stands for. Spare copies in scope less open any-copy legs give `copies`; `hidden` is `max(0, copies − in-scope shown copies that are transferable and unreserved)`. `resolveTheirItems` computes it once per collection, after the entries loop, through `inAnyCopyScope` on each shown copy. The loop also changes so that a collection reached only through shown-named entries gets an any item.

The picker reads the any control from it:

| Group | `hidden` | Control in the dialog | Top |
| --- | --- | --- | --- |
| Hidden copies only (no shown copy) | > 0 | the count tile, no dialog | `hidden` |
| Shown and hidden copies | > 0 | count, "They choose the serial · N available" | `hidden`, whatever serials are checked |
| Shown copies only, 2+ available | 0 | checkbox worth one | 1 while `copies − serials checked ≥ 1` |
| Shown copies only, 1 available | 0 | none | – |
| A held any count above 1 in a group with `hidden` 0 | 0 | count | its own count, only down |

`anyTop(item, picks)` (`quantity.ts`) is the one rule: `hidden > 0 ? hidden : min(1, copiesLeft(picks, slug, copies))`, raised to the held count. The picker's stepper and `pickProblem`'s "Only N available" both read it.

The bound is safe for any choice of checked serials. The server allows `copies − in-scope serials named`, and in-scope serials named ≤ in-scope shown available, so the server's bound ≥ `hidden`.

`bySerial` keeps its meaning (a whole-collection entry on a list that shows serials), and only its doc line changes. Together the two fields mark an any item that exists only because shown entries name copies: `hidden === 0 && !bySerial`. That is the marker decision i needs. A tab open from before the deploy draws such an item as today's stepper tile, capped at `copiesLeft`, which the server accepts.

Rejected:

- **Deriving `hidden` on the web** as `copies` less the group's available shown copies. It holds only while every shown copy is in scope, which a counter's kept copy (on no list) breaks. It also needs `openAnyCopyLegs` mirrored in the client.
- **A boolean `shownOnly`** beside a redefined `bySerial`. Two new meanings where one field and the existing one suffice.

### b. "Any serial · N more"

Kept as the mock has it, for a tile with both shown and hidden copies. N is `hidden`: copies only Any serial reaches, beyond those shown by serial. The tile's first line already counts the shown ones ("Choose from 2 serials"), so "N available" there would read as if it were the same copies. A hidden-only tile keeps "Any serial · N available", where N is again `hidden`, which equals `copies` there. The builder's note under an any pick reads "Any serial · N available" with N = `anyTop`.

Rejected: "Any serial · N available" in both places. In a mixed tile it reads as a second count of the same copies.

### c. The two scenarios that described separate tiles

"Copies shown by serial" and "Same collection on a visible list" are rewritten as one tile and its dialog (spec delta, Hidden serials stay hidden in offers). Four scenarios are added beside them: "Copies named on a list that shows serials", "Any serial beside every serial", "One copy shown" and "Serials checked beside the hidden count".

### d. Warnings on a grouped tile

A tile that stands for one copy shows that copy's flag, as today. That covers "Not transferable" or "In a trade in progress" (destructive, `aria-disabled`), and "Also in your open offer O-874" (warning, still pickable).

A tile that opens the dialog shows exactly:

- line 1, the collection label;
- line 2, "Choose from N serials" / "{picked} of {count} picked" / "All {count} picked" / "None available";
- for a mixed group, "Any serial · N more";
- the ratio chip when shared (decision g);
- muted "{count} can't be offered" when any shown copy is unavailable.

It never shows the open-offer warning. That warning shows on the copy's row in the dialog, and on the copy's card in the builder once picked. A count tile for hidden copies has no per-copy flags: its copies are counted only when sendable.

Rejected: a warning-coloured "{n} in your open offers" on the tile. The approved mock has none, and the row and the card already name the offer.

### e. Paging by collection

The problem is real on all three reads. A page now ends where a collection ends: up to 200 copies, never splitting a collection; a collection with more than 200 copies is a page of its own. The response stays a flat `items` array. Within a page, a collection's items sit together: the any item first, then copies by ascending serial. The web groups consecutive items by `collectionSlug`.

- **You get over lists.** The list is resolved whole on each request already, so this costs nothing. `theirPickerPage` orders the narrowed items by collection (first-seen in entry order), then cuts at the collection boundary at or below `offset + 200`. `nextOffset` stays an index into that order, and the input is unchanged.
- **You give and the collection picker.** `ownedPage` becomes `ownedGroupPage`, one indexer statement:

  ```sql
  WITH g AS (                      -- one row per collection the addresses hold, narrowed as today
    SELECT o.collection_id, c.slug, max(o.received_at) AS r, count(*) AS n
    FROM objekt o JOIN collection c ON c.id = o.collection_id
    WHERE o.owner = ANY($addresses) AND <filters, slugs, where>
    GROUP BY o.collection_id, c.slug),
  w AS (SELECT *, coalesce(sum(n) OVER (ORDER BY r DESC, slug DESC
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS before
        FROM g WHERE <after the cursor: (r, slug) < ($r, $id)>),
  p AS (SELECT * FROM w WHERE before = 0 OR before + n <= 200)   -- whole collections only
  SELECT <objektColumns>, p.r,
         EXISTS (SELECT 1 FROM w WHERE before > 0 AND before + n > 200) AS more
  FROM p JOIN objekt o ON o.collection_id = p.collection_id
  WHERE o.owner = ANY($addresses) AND <where>
  ORDER BY p.r DESC, p.slug DESC, o.serial
  ```

  With `more`, the next cursor is `{ receivedAt: r, id: slug }` of the last collection on the page. `receivedAtCursorSchema` takes any string `id`, so the input is unchanged. The tie-break is the collection's slug, which is text: `collection.id` is a `uuid`, and an open tab's cursor still holds an objekt id, which a uuid cast would turn into a 500. Compared as text, that cursor only places one page boundary differently.

  The `GROUP BY` reads the addresses' rows through `idx_objekt_owner_collection_id` (`owner, collection_id`, with `INCLUDE (received_at)` in production), index-only. Its cost grows with the holder's objekts, not the page: a holder with 20,000 objekts pays that scan on every page. It is still one statement per page, as today.

- **You give's have-list section** (`suggested`) cuts at a collection boundary too. A collection can show a tile in "From your have lists" (the copies those lists name) and another in "All your objekts" (every copy). Both read the one selection.
- **The collection picker's kept objekts** lead the first page with every copy of their collections. Later pages leave those collections out (`slugs NOT IN`), so a collection never shows twice.
- **No grouping** for `myObjektsOptions` (`objektIds`): it reads flags, not a grid. `myCopyOptions` (a counter's any-copy ask on You give) now gets every copy of its collection on its first page, where before only the newest 200 objekts came.

Rejected:

- **Grouping on the web across pages.** A tile's count would grow as later pages load, and a dialog opened early would miss copies.
- **Expanding each cursor page with every copy of its collections**, dropping a collection a newer copy already showed. The cursor stays exact and there is no aggregate, but a page's size is unbounded: two hundred collections of a holder with hundreds of copies each come back in one response. Pages can also come back empty with a cursor.
- **A `groups` array in the response.** It doubles the shape for old tabs and the builder's flag map, for data a contiguous flat array already carries.

### f. One post per offer

A tile stands for the copies the picker's read returns.

- **Picker fixed to one post** (`TheirsGrid`'s `post`), **or narrowed by List**: the read is `resolveTheirItems(…, fromList)`. The group holds that list's copies only, and its any item is scoped to that list's entries, matching `getScope` at send. The dialog's metadata names that one list, and no row names a list.
- **Across posts** (All their lists): the group spans lists. The metadata joins the list names in list order. A row names its list when the copies shown by serial come from more than one list (`rowsNameLists`); a group whose second list hides serials has rows from one list only, which the metadata already names. A pick asking for any copy that came through a list the group does not show (the picker since narrowed by List, or Offer on since moved) is not the group's: the group neither counts it nor offers Any serial over it, and confirming or clearing leaves it (`anyElsewhere`). A copy on two lists shows the first, as `resolveTheirItems`' `seen` keeps it today. A kept counter copy on no list shows no list name.
- **Confirm** replaces only the picks of the copies the dialog shows (its shown copy ids, and its any key when it has an any item). A pick of the same collection from another list stays in the selection, and the builder's `reasonOf` marks it "Not on {post}" as now.

### g. Ratio

A ratio belongs to an entry. `resolveTheirItems` already puts it on each shown copy and on the any item (from the entry that produced it).

- **Tile chip:** the tile carries it when every item in the group carries the same `ratio`, an item with none counting as different. A single-copy or hidden-only tile carries its item's chip as today.
- **Dialog:** with a shared ratio, the header repeats it. Otherwise each row with a ratio, and the any control when its item has one, carry their own.
- **Builder:** each picked card carries its own, unchanged.

### h. Estimated serials, the limit and dismissal in the dialog

These are carried from the mock's section 4.

- **Estimated serials.** Rows read "~#12" through `SerialNo` (the "~" `aria-hidden`, "estimated" read before it). The dialog shows `EstimatedSerialNote` once below the rows when any row is estimated. A single-copy tile reads "~#31" as today.
- **Room.** Room = 50 − the selection's total without the picks this dialog replaces. At the room:
  - unchecked available rows, an unchecked checkbox, the count's + and Select all are disabled, and the disabled rows point at the footer line with `aria-describedby`;
  - the footer reads "This side is full. Remove one to pick another.";
  - Select all checks rows in order until the room is used.
- **Dismissal.** Cancel, Close, Escape and a backdrop click discard the dialog's draft and close only the dialog. Focus goes back to the tile (`finalFocus`). Base UI dismisses only the topmost of nested dialogs (`DialogInteractions`, `isTopmost`), so Escape never reaches the sheet. Enter never confirms: rows are checkboxes, and the dialog has no form.

### i. Prefills stay per copy

Every prefill keeps building `OfferPick`s as now. The selection's model is unchanged: one pick per copy key, one any pick per collection.

The new any items must not change which copy a prefill chooses:

These rules work per list, while the any item is one per collection and `hidden` counts across every list. In a mixed collection (SooMin 204Z: #615 and #1077 on "spares", two on "quiet haves"), `hidden > 0` alone would let a match or an ask through "spares" take Any serial. So each path decides by the list it runs through:

- **Matches and near matches** (`itemsOnLists`, `lib/offer-prefill.ts`): an any item is matched only to an offered entry that lists the collection as any copy (`entryObjektId(entry) === null`: a whole-collection entry, or any entry on a list that hides serials). A match only through shown-named entries drops it. `getChoice` is unchanged and still takes the any item first when one survives, else the lowest sendable serial. A match through "spares" therefore adds #615, one through "quiet haves" adds any serial, and HaSeul 302Z #88 still beats an Any serial ("Which copy a match adds").
- **Make offer for one objekt** (`resolveGetAsks`): `resolveTheirItems` gives the any item the `listSlug` of the first entry that lists the collection as any copy, falling back to a shown entry only for a collection with none. `resolveGetAsks` keeps an ask only when the any item on the ask's own list is `listedAsAny` (`bySerial || (hidden ?? 1) > 0`). Otherwise it resolves to the first sendable copy. So "spares" gives #615, "quiet haves" keeps the any ask, and "doubles" naming #12 and #40 gives #40 ("Ask for one objekt of a post").

`listedAsAny` lives in `schemas/offer.ts`, since the web may import `schemas/`, not `lib/`.

The grouped picker then shows what any prefill made:

- a picked copy is a checked row, or a picked tile with its check;
- an any pick is its count (hidden or mixed group) or its checked "Any serial" (shown-only group);
- an any count above 1 in a shown-only group shows as a count that can only come down;
- a counter's resolved give copies (`replaces`) are checked rows, and Done drops `replaces` as now.

### j. Where Any serial is never offered

You give is never offered Any serial: gives are always specific. Neither is the collection picker: `collectionAskAllowed` refuses an any ask from a collection. Both still group, with a dialog of rows only.

### k. Web structure

- **`features/offers/copy-groups.ts`** (new, pure, tested). It holds:
  - `groupItems(items)`: `CopyGroup[]` in first-seen order;
  - `tileOf(group, selection, room)`: the tile's kind, lines as data, mark, and whether it is disabled;
  - `anyControlOf(group, selection)`;
  - `selectAll`, `clearGroup` and `applyGroup(selection, group, draft)`;
  - `dialogFooter` and `confirmOf`.

  Strings stay in the components.
- **`features/offers/serial-dialog.tsx`** (new). It uses the vendored `Dialog` (`DialogPopup`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogPanel`, `DialogFooter`, `DialogClose`), nested inside the picker's `SheetPopup` so it is a child dialog. Rows are a `FadeScrollArea`, since a dialog's own scroller must be one (`apps/web/AGENTS.md`, UI kit). Each row is a `Label` around the vendored `Checkbox`. The any count is the vendored `NumberField`, through `CopyStepper` moved out of `candidate-tile.tsx` into its own file. Dismiss is `m.common_modal_cancel()`, since the dialog commits.
- **`CandidateTile`** stays the one tile component, taking a `CopyGroup` instead of an item. It keeps the `role="button"` div, since WebKit collapses the card in a `<button>`. A group tile adds `aria-haspopup="dialog"`, and `SelectedMark` gains an optional count.
- **`PickerSelectionContext`** gives a tile what it needs (`selection`, `room`, `full`, `fullId`, `onToggle`, `onCount`, `onOpen(group)`). `OfferPicker` owns the open dialog's group, so one dialog serves the sheet.
- **`quantity.ts`** gains `anyTop`, and `byCollection(picks)` for the builder's display order. The order is applied only where `SideColumn` draws, so `holdsDraft`'s comparison with the prefill is untouched.

Rejected: a second grid component for groups, and a selection store. The existing tile, grid and context already carry the selection, and `VirtualCardGrid` is generic over its items.

### l. Copy and i18n

New strings go in `en`, `ko` and `ja`, in `offer_picker_*` and `offer_any_copy_*`. Plurals follow the repo's `_one` key beside the plural key (`objekt_holders_copies_detail_one`). Every string is whole, with placeholders. The strings are those of the interaction spec's copy table:

- "Choose from {count} serials" / "Choose from 1 serial";
- "{picked} of {count} picked", "All {count} picked";
- "{count} can't be offered", "Any serial · {count} more", "None available";
- "{artist} · {season} · {lists}", "{artist} · {season}";
- "Pick the copies you want from {name}.", "Pick the copies you'll give.";
- "Select all", "Clear", "Any serial", "They choose the serial · {count} available", "Any serial of {name}";
- "{count} of 50 on this side", "Pick 1 copy" / "Pick {count} copies", "Pick copies", "Remove all".

Existing strings are reused, among them "Any serial · {count} available", "They choose the serial", "One fewer copy of {name}", "This side is full. Remove one to pick another.", "Cancel" and "Close".

`ko` uses 합니다체. `ja` uses full-width ？ and ends a sentence with 。 where the English has a full stop. None of these strings is Discord output, CSV or changelog text.

## Response shape

The input schemas are unchanged. `CandidateItem` gains one optional field, and pages gain an ordering contract.

```ts
const candidateItemSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  serialEstimated: z.boolean(),
  transferable: z.boolean(),
  reserved: z.boolean(),
  inOpenOffer: z.number().array(),
  listSlug: z.string().nullable(),
  copies: z.number().nullable(),
  /** any copy only: an entry names the whole collection on a list that shows serials */
  bySerial: z.boolean(),
  /** any copy only: of `copies`, those no serial in this read stands for, which only Any serial reaches */
  hidden: z.number().int().optional(),
  ratio: z.number().int().optional(),
});

/** an any copy the partner listed as one (whole collection or hidden serials), not one over shown copies */
export const listedAsAny = (item: CandidateItem) =>
  item.objektId === null && (item.bySerial || (item.hidden ?? 1) > 0);

// web, copy-groups.ts
type CopyGroup = {
  slug: string;
  /** copies shown by serial, ascending; unavailable ones keep their place */
  shown: CandidateItem[];
  any: CandidateItem | null;
  /** list slugs the group's items come from, in list order */
  lists: string[];
  /** the ratio every item shares, else null */
  ratio: number | null;
};
```

`hidden ?? 1` reads a server from before the change, which never emits an any item over shown copies, as listed. Pages: a collection's items are contiguous, the any item first, and never split across pages.

## Risks / Trade-offs

- **[Risk]** The grouped You give and collection pages aggregate the holder's rows on every page. → The read is index-only on `(owner, collection_id)`. A task measures it with `EXPLAIN ANALYZE` against the production indexer, read-only (`PGOPTIONS='-c default_transaction_read_only=on'`), for a holder of several thousand objekts. If it exceeds about 50 ms, the cut can run on a cached per-holder group list instead, with the same response.
- **[Risk]** A tab open across the deploy pages You get by `offset` and You give by cursor under the old order. It may skip or repeat a few copies on its next page. → It reloads the picker on the next open, and the builder's checks are unchanged.
- **[Risk]** An old tab shows a shown-only any item as a stepper. → Its top is `copiesLeft`, which the server accepts. Nothing wrong is sent.
- **[Trade-off]** A page can hold far more than 200 objekts when one collection is big. → It is a single collection, which the dialog must list whole anyway.
- **[Trade-off]** In a mixed group, Any serial cannot draw past `hidden` even when the server would allow it, after a whole-collection hidden entry. → It is conservative. More copies are picked by serial.
- **[Risk]** A collection's two tiles in You give (have lists and All) can disagree on "{picked} of {count}", since each counts its own copies. → Both read one selection. A pick shows in both, and confirming either changes only its own copies.

## Migration Plan

No database migration: the change adds no column or index, and `idx_objekt_owner_collection_id` already serves the grouped read. Web and API ship in one image, and the API change is additive, so the order needs no care. Rollback is a redeploy of the previous image. Offers sent with an any ask over shown copies stay valid under the old code: accept never checks scope.

## Observed differences

These are places where the code and the main spec disagree today. This change fixes none of them silently.

1. **Any copy at accept.** Hidden serials stay hidden in offers says an any ask through hidden-serial entries "SHALL draw only on those objekts". The code enforces that only at send (`getScope`). Accept counts every transferable, unreserved copy of the collection, and the verifier takes any copy the giver sends. This change keeps that, and keeps the requirement's "SHALL draw only on" wording, now over every named copy. The code reads it as a rule for the request (what may be asked and how many), not for which copy is delivered. A change meant to bind delivery would need a scope on the leg.
2. **The hidden count drops as serials are picked.** The spec says the count goes "from 1 up to N". In a collection with hidden-named and shown-named copies, the picker's stepper and the builder's "Only N available" subtract serials picked by serial (`copiesLeft`), though those copies lie outside the any scope. The picker then stops short of what the server accepts. Decision a2 changes this on purpose: the new scenario "Serials checked beside the hidden count" pins it.
3. **A whole-collection any held above 1.** The spec says an any item over copies also offered by serial "SHALL stay a single pick". `CandidateTile` still shows the stepper when a count above 1 is already held (from another List choice or a counter). The modified requirement now says so: such a count shows and can only come down.
4. **"Any serial · N held" in You give's picker.** The spec names it for You give's picker. The You give picker never shows an any item: gives are always specific. That text appears only in the builder, under a counter's any-copy ask. The wording is left as it was.
