## Why

You get's picker shows all of the partner's have and sale lists mixed together, and only each item's list name tells them apart. When someone keeps several lists ("doubles", "spares", "sale 2026"), the sender cannot look at one of them. You give already has a **From** choice for the sender's own lists, so You get should have one too.

## What Changes

- **From on You get.** When You get's picker draws on the partner's lists and the offer is not scoped to one list, it offers a **From** choice:
  - "All their lists", the default and today's behaviour;
  - or one of the partner's have or sale lists on Trade, shown as "{list name} · {type}", as You give shows the sender's lists.

  Picking a list shows only that list's entries the sender may ask for. The filters and "Only what I want" apply on top.
- **Where it shows:** builders opened from a conversation, from the person sheet, and from a want-only Trade post.
- **Where it doesn't:**
  - an offer scoped to one list (a have or sale post, a Market listing), which already shows only that list;
  - the collection picker, used when the partner has no list;
  - a partner with only one list, where the choice would do nothing.
- Picking under From changes only what the picker shows. Anything on any of the partner's lists can still be sent, and the send check is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: "Offer builder" gains You get's From choice. This change reverses the earlier non-goal "A From choice on You get".

The delta is written against "Offer builder" as `offer-from-post-list-only` leaves it. That change is applied but not archived. Archive it before this one.

## Non-goals

- A From choice for a scoped offer, which would undo the post's lock.
- Want lists, or lists off Trade, as From choices.
- Remembering the choice between pickers, or changing the shortcut strips.
- Changing what can be sent.

## Routes

- The offer builder's You get picker, opened from `/messages/$id`, the person sheet on `/trade` and `/trade/for-you`, and a want-only post on `/trade`.

## Impact

- `packages/api`:
  - `services/offer/core.ts`: `allowedEntries` takes an optional `fromList` narrowing, which a scoped offer ignores.
  - `services/offer/picker/theirs.ts`: `theirPickerPage` passes `fromList` through and returns the partner's list choices on its first page.
  - `services/offer/picker/index.ts`: the output type gains `lists`.
  - `schemas/offer.ts`: the doc comment on `fromList` now covers theirs. No input change, since `fromList` is already accepted on every side.
- `apps/web`:
  - `offers/offer-picker.tsx`: `TheirsGrid` gets the From select, reusing `SingleSelect` and the `offer_picker_from*` messages.
  - `offers/queries.ts`: `theirPickerOptions` takes `fromList`.
  - one new message, "All their lists", in en, ja and ko.
- No database change. `/rpc` stays compatible: the output field is optional, and an old tab never sends `fromList` for theirs.
