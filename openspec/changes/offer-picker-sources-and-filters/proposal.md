## Why

The offer builder can ask only for objekts on the partner's bound have or sale lists. Many people never make a list, so their You get picker is always empty. The sender can still see the collection on the partner's profile, but cannot ask for anything in it.

On the other side, You give lists every objekt the sender holds. Their have lists only come first. Someone who keeps separate lists for separate trades cannot narrow the picker to one of them.

Both pickers filter only by member, season and class. That is not enough to find one objekt in a large collection.

## What Changes

- **Their collection:**
  - When the partner has no have or sale list bound to a Cosmo profile and on Trade, You get's add button reads "Add from {name}'s collection".
  - Its picker lists the objekts the partner holds at their linked addresses, newest received first, loaded as it scrolls.
  - A partner who lists anything stays protected by their lists, and the picker shows their lists as today.
- The server SHALL accept a You get item that is on none of the partner's lists only while the partner has no such list. It checks this when the offer is sent.
  - If the partner has made a list since the builder opened, the send is refused with the existing "not listed" refusal.
- Privacy: their collection skips any address whose profile is private to the sender. On an address with hidden serials, the picker offers each collection as "any copy" and never names a serial.
- **Your lists:** You give's picker gets a **From** choice:
  - All your objekts, the default and today's behaviour;
  - or one of the sender's have, sale or general lists.

  Picking a list shows only the objekts on that list that the sender still holds.
- **Filters:** both pickers, and the chat attach pickers that share their filter bar, add three filters:
  - **Artist**, which narrows the member choices to that artist;
  - **Online / offline**;
  - **Collection number**.

Routes covered: the offer builder dialog (opened from a conversation, a Browse post and the person sheet), and the chat attach pickers.

## Non-goals

- Asking for unlisted objekts from a partner who has lists, a "not listed" mark on offer items, and a setting to opt out. The rule above makes these unnecessary.
- A From choice on You get. Their lists already show together, each item naming its list.
- Changing accept, verification, the counter-offer rule or rate limits.
- Want lists as a You give source.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`:
  - "Offers name objekts on both sides": You get may come from the partner's collection when they list nothing.
  - "Offer builder":
    - their-collection picker;
    - From choice on You give;
    - artist, online/offline and collection-number filters.

## Impact

- `packages/api`:
  - `schemas/offer.ts`:
    - a new `side: "theirs-collection"` on `offer.candidates`, with cursor paging;
    - an optional `fromList` narrowing;
    - an optional `partnerLists` flag in the output.
  - `services/offer/picker/` (`theirs.ts`, `mine.ts`, `index.ts`);
  - `services/offer/index.ts`: the `not_listed` check and the any-copy scope for collection items;
  - `services/offer/core.ts` and the privacy helpers;
  - tests for the pure rule in `lib/offer-rules.ts`.
- `apps/web`:
  - `offers/offer-picker.tsx`, `offers/queries.ts` and `offers/builder/side-column.tsx`;
  - `filters/picker-filter-bar.tsx`, plus the two chat attach pickers that use it;
  - messages in en, ja and ko.
- No database change. An offer item from a partner's collection has a null `list_id`, as a kept counter item does today.
- `/rpc` stays compatible:
  - Every new input is optional or a new enum value.
  - The new output fields default when absent.
  - An open tab keeps the current pickers and keeps sending list-only asks.
