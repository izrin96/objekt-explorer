# Design

## Context

See proposal.md, Why. Each side holds at most `OFFER_SIDE_LIMIT = 50` (`packages/api/src/schemas/offer.ts:8`). Production shows real demand: 53 of 8,091 offers have a side at 50, and 140 have a side over 30. The largest trade has 72 legs, and 143 legs are open across all trades (read-only reads of the production database, 2026-11-13).

An accept writes one `trade_leg` per objekt, so 200 a side is a trade of up to 400 legs, against 100 today. The questions in `design/backlog.md` (Raise the 50-objekt limit) are answered below from the code.

## Findings

### 1. Where the limit lives

Every use imports the constant. No code hard-codes 50 for this limit.

| Use | File:line | At 200 |
| --- | --- | --- |
| The constant | `packages/api/src/schemas/offer.ts:8` | 200 |
| Request cap, `give`/`get` `.max(OFFER_SIDE_LIMIT * 10)` | `schemas/offer.ts:172-173` | 2000 a side. Kept as an expression (Decision 4) |
| Counter flag read, `objektIds.max(OFFER_SIDE_LIMIT)` | `schemas/offer.ts:230` | 200 |
| Send refusal `too_many` | `lib/offer-rules.ts:128` (`validateShape`, called at `services/offer/index.ts:122` before any read) | follows |
| Matches prefill cap | `lib/offer-prefill.ts:48` (`chooseMatchPicks`) | follows |
| Picker room, full state and count | `apps/web/src/features/offers/offer-picker.tsx:121,135,147,154,197` | follows |
| Serial dialog room and footer | `features/offers/copy-groups.ts:242,323`, `serial-dialog.tsx:397` | follows |
| Builder side count, Send gate and hint | `builder/side-column.tsx:116`, `builder/draft.ts:325,338` | follows |
| Near picks and matches line | `builder/form.tsx:217`, `offer-builder.tsx:83` (`withNear`), `builder/matches-line.tsx:166-176` | follows |
| Refusal text | `features/offers/refusal.ts:54` | follows |
| Tests | `lib/offer-rules.test.ts:170`, `builder/draft.test.ts:522-621`, `refusal.test.ts:95` derive from the constant. `lib/offer-prefill.test.ts:115-122` hard-codes 50 and 60 | that one test changes |

- **Strings:** `offer_refused_too_many`, `offer_side_count`, `offer_picker_count`, `offer_picker_side_total`, `offer_matches_capped_give` and `offer_matches_capped_get` take `{max}` in en, ko and ja. None needs an edit. No message file holds a 50 that means this limit.
- **Other 50s that are not this limit:**
  - `OFFER_VIEWS_LIMIT = 50` (`schemas/offer.ts:197`) is offers per `offer.views` call.
  - `THREAD_PAGE_SIZE = 50` (`schemas/chat.ts:10`).
  - The literal `50` in `copy-groups.test.ts`, `quantity.test.ts` and `near-picks.test.ts` is a room argument passed explicitly.
  - All stay.
- **`CANDIDATE_PAGE_SIZE = 200`** (`schemas/offer.ts:12`) is a picker page, not tied to the limit, with one exception. A counter's give picks get their flags from one non-paged read: `myObjektsOptions` (`apps/web/src/features/offers/queries.ts:123`, used at `builder/form.tsx:151`) sends `objektIds`, which `picker/mine.ts:96-100` answers with the flat `ownedPage` (`picker/shared.ts:262-289`), cut at `CANDIDATE_PAGE_SIZE` rows. With more than 200 ids, flags past row 200 would not come back. So `OFFER_SIDE_LIMIT ≤ CANDIDATE_PAGE_SIZE` is an invariant, and 200 is the largest limit until the page size changes (Decision 1).
- **Layout:** no CSS assumes a count. Item 5 covers the side grids.

### 2. Accept (`packages/api/src/services/offer/accept.ts`)

- **Before the transaction:** one read of the offer's items (`:46-54`) and `checkItems` (`:66-74`). Both are per set.
- **Locks:**
  - `lockParties` and `lockAddresses` are per party and address.
  - The any-copy advisory lock is taken once per giver, so twice (`:99-104`).
  - None grows with items.
- **Legs:** one multi-row `INSERT` (`:115-129`), 7 bind parameters a row, so 2,800 at 400 legs, far under the 65,535 cap. A `trade_leg_reserved` conflict still becomes the `reserved` refusal (`:130-134`).
- **Cancelling other offers that held the objekts:** one `UPDATE … WHERE offer.id IN (SELECT … WHERE objekt_id IN (…))` (`:156-176`), at most 400 ids. The notes go through `writeNotes`, one pair per cancelled offer, as today.
- **Under the lock, `refuseCopyShortfall(…, recheck = true)`** (`items.ts:178-237`) calls `reservedIds` over the counted copies and `openAnyCopyLegs` once.
- **Verdict:** one transaction holds a 200-for-200 accept. No statement runs per item, and no parameter count nears a cap.

### 3. Send and `checkItems`

- `createOffer` (`services/offer/index.ts`) refuses `too_many` at `:122` before any read.
- Every later read is per set:
  - the list and rule reads (`:189-275`). Their per-ask work is in memory, with no query per item: `entriesFitting` and `askCandidates` (`lib/offer-recipient-rules.ts:51-58`) for each ask, `onePostVerdict`, and `anyAsksFit` (`:66-86`), which counts each any-copy collection against the chosen list's entries. At 200 asks over a partner's few thousand entries, that is about a million comparisons, a few milliseconds;
  - `checkItems`, `givesWanted`, `openOfferHolders` and `partyNames` in one `Promise.all` (`:297-325`);
  - one `offer_item` insert (`:434-448`, 5 parameters a row, 2,000 at 400).
- `checkItems` (`services/offer/items.ts:95-166`) runs `fetchObjekts` (one `inArray` over the specific ids), `sentEarly` (one read per side, accept only), `fetchCopies` (one read per side) and `reservedIds` (one read).
- **The one list that grows past the item count** is `reservedIds`' input (`items.ts:123-126`, `core.ts:209-216`). It holds every specific id plus every copy that `fetchCopies` returns: each copy either party holds of every collection the offer names. It is one bind parameter per id, unchunked.
  - Its bound is holdings, not the side count.
  - The largest linked account holds 11,691 objekts and the next 7,914 (read-only read of the production databases, 2026-11-13). So the worst offer between the two biggest holders passes about 20,000 ids, a third of the cap.
  - The limit raises how many collections an offer names, never past what both parties hold.
  - Not a prerequisite. Turning it into `= ANY($1)` with one array parameter (the Round trips rule in `packages/api/AGENTS.md`) is a follow-up.
- **The one per-item read sits in the builder, before send.** A counter's any-copy asks on You give each fetch the sender's copies of their collection:
  - `builder/form.tsx:157-160` runs `useQueries` with one `myCopyOptions` (`features/offers/queries.ts:104`) per ask in `asksOf(give)`, one `offer.candidates` call per distinct collection.
  - Each call is a full first page of the mine picker: the owned read, the have-list read, `reservedIds`, `openOfferHolders`, `anchoredSerialIds` and `collectionsOf` (`picker/mine.ts:77-215`).
  - `offer.candidates` is limited to 120 calls a minute per user (`limitPicker`, `routers/offer.ts:27`). The oRPC batch link splits a batch past 10 calls (its default `maxSize`), so nothing caps the fan-out but that limit.
  - Today at most 50 asks fit. At 200, a counter of an offer that asked for any copy of more than about 115 of the sender's collections (the partner's own theirs read and the flag read share the budget) gets the rest refused. Those asks stay unresolved, with Send blocked, and the picker is refused for the rest of the minute.
  - Such offers come from the matches prefill, which picks an any copy wherever a list offers one (`getChoice`, `lib/offer-prefill.ts:33-41`). So a partner's hidden-serial have list with many collections produces them.
  - This is the one prerequisite (Decision 5).

### 4. The worker's trade verifier (`apps/worker/src/job/trade-verifier/`)

Nothing fails at 400 legs: no cap, `LIMIT` or `statement_timeout` is reached. Indexer reads are per set or batched (`COPY_READ_BATCH = 100`, `TRANSFERABLE_BATCH = 500`, `OWNER_BATCH = 500`). Four loops already run per leg or per note under the trade's `FOR UPDATE` lock, and they grow linearly:

- **`settleTrade`** (`index.ts:240-271`): a savepoint and an `UPDATE` for each leg a transfer verifies. The savepoint keeps one `isUniqueViolation` from aborting the rest.
- **`recordAway`** (`index.ts:490-492`): one `UPDATE` for each leg newly away.
- **`autoAccept`** (`locked-trade.ts:44-49`): `acceptCopy` per pending copy (`packages/api/src/services/offer/verify.ts:236-271`), about five statements each, with `removeReceived` called per copy.
- **`writeNotes`** (`packages/api/src/services/offer/notes.ts:69-92`): two statements per note. Wrong copies and automatic accepts write two notes per copy. Each user's group still ends with one unread row, and one push per user.

At 400 legs the worst run (every leg verifying, or expiring with a copy pending on every leg) holds the trade lock for roughly 1,000 to 2,000 sequential statements, against about a quarter of that at 100. This is estimated, not measured. It delays a cancel or confirm on that one trade, and nothing else.

`verify.ts:106` (`inArray(transfers.objektId, specificIds)` over every open specific leg) and `index.ts:558-561` (`refreshWatch`) grow with legs open across all trades: 143 today, so a cap would need about 65,000. Not a prerequisite. Batching these is the follow-up in Open Questions.

### 5. Views at 200 a side

| View | File | How it draws | At 200 a side / 400 legs |
| --- | --- | --- | --- |
| Chat offer card | `features/offers/offer-side-list.tsx:20,39` | `SIDE_TILES = 12`: 11 tiles and "+N" | unchanged |
| Card's "show all" sheet | `offer-side-list.tsx:117-161` | plain list of rows with thumbnails, grouped by `groupRows` | up to 200 rows a side; lazy thumbnails |
| Offer picker | `candidate-grid.tsx:80` (`VirtualCardGrid`) | virtualised | unchanged |
| Serial dialog | `serial-dialog.tsx:306` | every copy of one collection | depends on copies per collection, not the limit |
| Builder sides | `builder/side-column.tsx:175-209` | **every pick**, `grid-cols-4 @sm:grid-cols-6` | **400 tiles** from `lg`, where the sides sit side by side |
| Trade page, The exchange | `trade-exchange.tsx:259-309`, `exchange-group.tsx:60-127` | **every leg**, grid or list. Filter chips and find narrow it. Below `sm` the other side is CSS-hidden, still rendered | **400 tiles** at every width |
| Cancel trade dialog | `cancel-trade.tsx:32-36` | names only refused legs, in a refusal | unchanged |
| Notifications | `schemas/offer.ts:490` (`NOTE_OBJEKTS = 3`) | three objekts at most | unchanged |
| Trade feed "+N" sheet | `features/trade/side-items-sheet.tsx:184` | virtualised; posts, not offers | unaffected |
| Staff trade legs | `features/moderation/tracking/staff-trade-legs.tsx:55` | every leg, as rows | staff only, 400 rows |

Thumbnails load lazily (`features/objekt/objekt-artwork.tsx:28`), so the cost of the two unvirtualised grids is DOM and React work, not network. Two screens draw 400 tiles at once: the builder from `lg`, and the trade page's exchange.

### 6. Prefills capped by the limit

- `chooseMatchPicks` slices to the limit and counts `matched` before it (`lib/offer-prefill.ts:43-49`).
- `withNear` stops at the room the limit leaves (`features/offers/near-picks.ts:21-31`).
- The matches line compares `matched` with the limit (`builder/matches-line.tsx:166-176`).
- All three follow the constant, and the spec scenarios move to 210 matched and 200 added.

### 7. Open tabs after the deploy

No input shape changes, and an open tab sends at most 50 a side, so every request it sends still validates (the `/rpc` rule in `packages/api/AGENTS.md`). What an open tab built with 50 does:

- Its pickers, the serial dialog and near picks still stop at 50.
- **Matches prefill.** `chooseMatchPicks` runs on the server, so `offer.suggest` can now hand it up to 200 picks a side.
  - Its builder then shows the side over its limit, with Send disabled and the hint "At most 50 objekts on each side."
  - Its matches line compares with 50, so with, say, 60 added it reads "Only 50 of the 60 that matched fit", though all 60 were added.
  - Removing picks down to 50, or reloading, clears it.
- **A newer offer with more than 50 a side:**
  - The offer card shows it normally: 11 tiles, "+N" and the sheet.
  - Accept works, since the server decides.
  - Counter opens the builder over its limit, with Send disabled, as above.
  - The counter's flag read sends up to 200 `objektIds`, which the new server accepts.
  - Its counter still reads copies once per any-copy ask (`filters`, still served), so past about 115 asks some reads are refused. Send is already disabled there by its own limit.

Nothing is lost or mis-sent: the old tab can only send less. This is accepted until the tab reloads (Risks).

### 8. Output outside the app

- Notifications carry at most three objekts (`NOTE_OBJEKTS`).
- Emails are the auth templates only (`packages/email/src/templates`).
- No Discord text or CSV export includes offer items.
- Nothing outside the app has a size limit to meet.

### 9. Lopsided accept and the ratio hint

- `isLopsided` is a ratio, `LOPSIDED_RATIO = 5` (`features/offers/lopsided.ts:1-11`), independent of size: 200 against 40 asks first, as 50 against 10 does.
- The ratio hint is each list entry's own trade ratio (`RatioChip` at `builder/side-column.tsx:197-198`, carried per item in `copy-groups.ts:51-59`).
- Neither changes.

## Goals / Non-Goals

**Goals:**

- 200 a side, with every derived bound following one constant.
- The invariant that caps it written where the next change to either constant will see it.

**Non-Goals:**

- Any query, worker or view rewrite beyond Decision 5 (proposal.md, Non-goals). Each one found is a follow-up with its trigger named.

## Decisions

### 1. 200, the page size, as the number

200 is what the owner asked for, and it is also the ceiling: `OFFER_SIDE_LIMIT ≤ CANDIDATE_PAGE_SIZE` (Findings 1). A higher number would also have to page the counter's flag read.

- **Alternative: 100.** It halves every growth named in Findings 4 and 5. With Decision 5 in place nothing found needs it: the server stays far from every cap at 200.
- **Alternative: a number above 200.** It needs the flag read paged first, and the views grow further.

The invariant goes into `packages/api/docs/offers.md`. No runtime assertion is added: the two constants sit five lines apart in one file, and the doc is where a change to either is read first.

### 2. No worker or database prerequisite

Each growth found is linear, and stays below its cap with a margin measured from production data:

- the leg insert, at 2,800 parameters;
- the offer items insert, at 2,000;
- `reservedIds`, at about 20,000 for the two biggest holders;
- the chat thread's card hydration (`services/chat/cards.ts:66-70`): `THREAD_PAGE_SIZE` 50 offers of 400 items is 20,000 ids, unchunked. A thread of fifty 200-for-200 offers is theoretical.

The verifier's per-leg loops already break the one-statement-per-set rule at 100 legs. Batching them is worth doing on its own, but it touches the transfer-uniqueness fallback and has no test coverage the repo allows (no database in tests). It does not belong in a one-constant change.

The one fix that does is the counter's copies read (Decision 5). It is a hard failure past about 115 asks, not a cost that grows.

### 3. The two full grids are measured, not rebuilt first

The builder's sides and the trade page's exchange are both unvirtualised and both reach 400 tiles. They get the same treatment: the browser pass on the local stack measures them, and neither is virtualised in this change.

Today they reach 100 tiles. Selecting a leg (`state.onSelect`, `exchange-group.tsx:73`) or removing a pick re-renders the side's tiles, since `state` and the press handlers change on each render.

- **Bar:** the measure takes the longest interaction under 4× CPU throttling: removing a pick on a side holding 200, and selecting a leg on a trade of at least 200 legs. Above 200 ms (the "good" INP line) the builder of this change stops and reports to the owner before calling it done (Open Questions).
- **Alternative: virtualise both first.** That means `virtua`'s window scroller over grouped, two-column grids with selection and focus. It is a UI change of its own, with its own spec questions (find, focus return, the phone's tab switch). Nothing shows it is needed at 200.
- **Alternative: lower the limit to avoid the question.** That trades away what the owner asked for on an estimate.

### 4. The request cap stays `OFFER_SIDE_LIMIT * 10`

- The schema's own cap only bounds the request. `validateShape` turns 201 to 2000 items into the `too_many` refusal the web app can word.
- 2000 small items a side is a body of about 200 KB that Zod parses in milliseconds. A tighter literal would turn an over-limit request into a validation error instead of a refusal.
- An open tab sends at most 50, so it still validates.

### 5. One copies read for a counter's asks, before the constant

`pickerNarrowingSchema` (`schemas/offer.ts`) gains an optional `copiesOf: slugSchema.array().min(1).max(OFFER_SIDE_LIMIT)`, served on the `mine` side.

- **Server (`mineCandidates`):** with `copiesOf`, the owned read is narrowed to those collections and is not paged: it is every copy the sender holds of them, lowest serial first (as a picker page orders a collection, so each ask takes the copy it took through its own read), with `nextCursor: null`. Its have-list suggestions are narrowed to those collections and are not cut at a page, and `reservedIds` and `openOfferHolders` take the ids as one array parameter. The web query keeps its previous data while the key changes, so removing an ask does not unresolve the others.
  - Its bound is the sender's holdings, the same rows today's per-collection calls return together, since a collection is never split across pages and one collection's first page is all of it.
  - The have-list section (`suggested`) stays, narrowed to the same collections, so the copies chosen do not change.
- **Web:** `myCopyOptions(to, collection)` per ask becomes one `myAskCopiesOptions(to, slugs)` query over the distinct collections of `asksOf(give)`, and `resolveAsks` receives that one page for every ask.
  - `resolveAsks` already skips copies of another collection and copies already taken, so it needs no change.
  - A `draft.test.ts` case pins this: two asks of different collections share one page, and each takes only its own copies.
- **Open tabs:** `copiesOf` is optional, so an older tab's per-collection `filters` reads still validate and are served as before.

Alternatives:

- **Raise `limitPicker`.** It is one line, but it weakens the limit on every picker read to cover one burst, and the burst still sends 200 reads.
- **Ship 100 instead.** About 100 asks plus the builder's own reads stay under 120, but only just, and the owner asked for 200.
- **Reuse `filters`.** `member`, `season` and `collection` are each a list, so their cross product would also match collections no ask names.

### 6. Tests derive from the constant

`lib/offer-prefill.test.ts` ("caps each side at 50…") becomes `OFFER_SIDE_LIMIT + 10` matches, `OFFER_SIDE_LIMIT` added and `matched` equal to `OFFER_SIDE_LIMIT + 10`, so it never drifts again. The other limit tests already derive from it.

## Risks / Trade-offs

- **[Risk] The unpaged copies read returns many rows for a big holder.** → It returns no more than the per-collection reads it replaces returned together, bounded by holdings (11,691 for the largest linked account), in one call instead of up to 200.
- **[Risk] An open tab mis-states a prefill and blocks Send** (Findings 7). → It sends nothing wrong, and a reload fixes it. No version gate is added for a transient state.
- **[Risk] The two full grids feel slow on a phone at 400 tiles.** → The browser pass measures both against a stated bar before the change is called done. Open Questions holds the next step.
- **[Risk] The verifier holds one trade's lock longer** (Findings 4). → It blocks only actions on that trade, for seconds at worst. The follow-up batches the loops.
- **[Risk] Someone raises the limit past the page size later.** → The invariant in `packages/api/docs/offers.md` names the read that breaks.
- **[Trade-off]** The card's "show all" sheet lists up to 200 rows unvirtualised. Rows are light, with lazy thumbnails, so it is left as is.

## Migration Plan

- One deploy of web: the API is part of the web image. The worker needs no deploy.
- No migration.
- **Rollback:** set the constant back to 50 and redeploy. Offers and trades already made with more than 50 a side stay valid.
  - The server reads them without the limit: accept, the verifier and the views never check it.
  - Countering such an offer after a rollback opens the builder over the limit, with Send disabled, as an open tab does today.

## Open Questions

- **If the browser pass measures over 200 ms on either grid, what then?** Recommended: keep 200, ship, and propose a follow-up change that virtualises both grids. The sizes only reach 400 for the few offers that use them (53 offers have ever hit 50). The alternative is shipping at 100 until the grids are virtualised.
- **Batch the verifier's per-leg statements, and `reservedIds` as `= ANY`, as a follow-up?** Recommended: yes, as one small change to `trade-verifier/index.ts` (`settleTrade`, `recordAway`), `locked-trade.ts` (`autoAccept`) and `services/offer/core.ts` (`reservedIds`), taken up when a trade over 200 legs shows a slow settle in the worker's logs, or with the next verifier change.
- **The spec's "first 6" on the offer card.** `web-trade-offers` (Offers name objekts on both sides) says the card shows the first 6 of a longer side. The code shows 11 tiles and "+N" past 12 (`offer-side-list.tsx:20`). This change copies that sentence unchanged. Recommended: correct the spec to the code in its own small change, since a side limit change should not reword it.
