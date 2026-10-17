## Why

Make offer on a Trade post opens the builder, but You get's picker lists every have and sale list the owner has on Trade, not the post the sender clicked. The sender is answering one post, so when that post offers a have or sale list, they should ask from that list only.

## What Changes

- **A have or sale post scopes You get to its list.** Make offer on a Browse post whose list is a have or sale list on Trade (a WTS post, or the have list of a WTT pair) opens the builder with You get's add button reading "Add from {name}'s list". Its picker lists only that list's entries, never the owner's other lists or their collection.
- **The server holds the same line.** An offer addressed to such a list is refused as "not listed" when You get holds anything off it.
- **A want-only post keeps today's rules.** A WTB post, or a WTT post with only a want list, has nothing of its own to ask from. Its owner wants to buy or swap, so You get still asks from all of their have and sale lists on Trade, or from their collection when they have none.
- **Conversations keep today's rules.** Make offer and Counter in a conversation, and Make offer from a person sheet, work as today, even in a conversation a post offer started.
- **The Market drawer gets the same scope.** Make offer on a listing in the objekt drawer's Market tab already addresses the seller's sale list, so it asks only from that list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`:
  - "Offers name objekts on both sides": an offer addressed to a have or sale list asks only from that list.
  - "Offer builder": the "Add from {name}'s list" picker.
- `web-trade-browse`: "Make offer on a post" scopes You get to a have or sale post's list. Its shortcut-strip text stays as it is. The strips have been off in code since `e5838ee9`, and that drift is out of scope here.

These deltas are written against `web-trade-offers` as `offer-picker-sources-and-filters` leaves it. That change is complete but not archived. Archive it before this one.

## Non-goals

- Changing You give: it still offers all of the sender's objekts, with its From choice.
- Locking the conversation that follows to the post's list.
- Bringing back the "From this post" shortcut strips.
- Closing the chat route: a sender may still ask from all lists in a conversation. The scope keeps the offer focused; it doesn't protect anything.

## Routes

- `/trade`: Make offer on a Browse post, and the builder it opens.
- The objekt drawer's Market tab: Make offer on a listing.
- Builders opened from `/messages/$id` and from the person sheet keep today's behaviour.

## Impact

- `packages/api`:
  - `services/offer/core.ts`: `Addressed` carries the target list when it is a have or sale list on Trade, and `allowedEntries` narrows to it. A scoped offer never falls back to the collection.
  - `services/offer/index.ts`: the create check.
  - `services/offer/picker/theirs.ts`: the picker and the collection page.
  - `services/offer/picker/index.ts`: an optional `scopedList` flag on the candidates output.
- `apps/web`:
  - `offers/get-source.ts`: a `scoped` source.
  - `offers/builder/form.tsx`: chooses `scoped` from `scopedList`.
  - `offers/offer-picker.tsx`: its title and description.
  - en, ja and ko messages.
- No database change.
- `/rpc` stays compatible: the new output field is optional. An open tab from before the change keeps showing all lists, and a send of an item from another list is refused as not listed.
