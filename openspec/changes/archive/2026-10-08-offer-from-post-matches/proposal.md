## Why

Make offer on a Browse post shows "From this post: select to add" with the first 8 entries of the post's list in list order. The objekts that match the viewer, the ones the post rings, often sit past entry 8 and never show. A WTB post shows nothing at all, because You get only draws from have and sale lists. And nothing helps with the other side: what the viewer holds that the post wants.

## What Changes

- **You get, matches first.** The strip under You get lists the post's have or sale entries that are on the viewer's want lists first, then the rest, still at most 8, and refills from the next entry as items are added.
- **You give, from the post's want side.** When the post has a want side (a WTB post, or the want list of a WTT pair), a second strip under You give lists objekts the viewer holds in collections on that want list, those on the viewer's profile-bound have and sale lists first, at most 8, one tap to add and refilling.
- Neither strip pre-fills the offer, and a strip with nothing to show is not rendered.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: Make offer on a post lays out the post's matches on both sides of the builder.

## Non-goals

- Pre-filling the offer from the post.
- Changing the full pickers, their "Only what I want"/"Only what they want" switches, or Make offer from For you or a conversation.
- More than 8 per strip; the pickers cover the rest.

## Routes

`/trade` (Make offer on a post, and the offer builder it opens).

## Impact

- `packages/api`: `offer.candidates` marks each of their entries that is on the sender's want lists, and its mine side takes a want list of the partner's to narrow to.
- `apps/web`: the post passes both its lists to the builder; the builder orders and refills the You get strip and adds the You give strip; en/ja/ko text for the new strip.
