# Proposal

## Why

A collector with many objekts told us the offer pickers are hard to use. Greyed tiles for copies that are not transferable clutter the grid, and in newest-received order a given collection is hard to find. The owner wants a sort and a switch in both pickers.

## What Changes

- Every picker gets a **Sort** select: You give, You get over a post's lists, and You get over a partner's collection.
  - It offers two orders. The first is the picker's own order of today, the default: "Newest received" in You give and the collection picker, "List order" in You get over lists. The second is "Collection No.".
  - Collection No. orders collections by collection number, then by member in roster order. Collections that tie on both keep the default order. This matches the profile grid's Collection No. sort when it runs low to high.
  - Pages still end on a collection boundary under either sort.
- Every picker gets a **Hide not transferable** switch, off by default. It leaves out copies whose objekt is not transferable. A tile all of whose copies are left out disappears. Reserved copies, and copies in another of the sender's open offers, stay shown with their flags, as today.
- Each choice is remembered in the browser once the user changes it. One value is shared by all three pickers, and the picker still works when the browser stores nothing.
- Reset leaves Sort and the switch alone, as it already leaves the matching switch. On phones, the Filters count includes the switch when it is on, and does not count Sort.
- When the switch alone empties a picker, the picker says "Nothing transferable to show" and offers Turn off.
- API: `offer.candidates` takes two optional inputs, `sort` and `transferableOnly`. A cursor for Collection No. paging carries its sort. Without the new inputs, the reads return exactly what they return today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: the Offer builder's picker rules gain Sort and Hide not transferable. Flags still show on every copy that is shown. Reset and the phone Filters count change to fit. New requirements cover the sort order, the switch, the remembered choice and the empty state.

## Routes

`/trade/@<handle>/offer`: the offer page and its picker sheets. Nothing else changes.

## Impact

- **API:** `packages/api/src/schemas/offer.ts` (the candidates input and its cursor), `services/offer/picker/{shared,mine,theirs}.ts`, `services/offer/core.ts` (`objektColumns`), and two new pure modules for the sort (`lib/picker-sort.ts`, `lib/picker-sort-sql.ts`), each with tests. The docs change in `packages/api/docs/offers.md`.
- **Web:** `features/offers/offer-picker-grids.tsx`, `queries.ts`, a new pure `features/offers/picker-view.ts` with tests, `stores/settings.ts`, `stores/legacy-storage.ts`, `messages/{en,ko,ja}.json`, and `apps/web/docs/offers.md`.
- **Database:** no migration and no new index. The grouped page aggregates the same rows it aggregates today.
- **Open tabs:** an older tab sends neither input and gets today's pages. `offer.candidates` is `/rpc` only, so `/api/v1` is unaffected.

## Non-goals

- A direction toggle. Collection No. runs low to high only.
- Other sorts: season, member, serial or rarity.
- Hiding reserved copies, or copies in another open offer.
- Changing what can be sent, or the checks at send. The whole theirs list the builder checks picks against stays unfiltered and in its current order.
- Matches added on open, near matches, Make offer for one objekt, counters, and the flag reads behind them (`objektIds`, `copiesOf`, `offer.suggest`). These ignore both inputs.
- Storing the choice on the account. It lives in the browser only.
