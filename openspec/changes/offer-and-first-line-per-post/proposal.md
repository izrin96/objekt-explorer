# Proposal

## Why

A user reported that a want-list rule on one post (P1, "any DCO") made swap suggestions for their other post (P2). `can-swap-per-post` fixed the chip, the Can swap section and count, and Can swap alerts. Two places still pair one post's wants with another post's haves: Make offer from a person's row fills every match the row counts, across all of the viewer's posts, and the suggested first message on a post card says "Want to swap?" whenever the match runs both ways.

## What Changes

- Make offer from a Trade row (and Make offer on this post, and Make offer from a conversation whose newest card is a post card) fills by the same rule as the row's chip:
  - a person the viewer can swap with (Can swap): only the matches inside the counted pair of posts, the swap "You can swap N" names;
  - anyone else: only the direction with more matches, the other side left empty for the sender to fill; a tie fills You get.
- On Make offer on this post, the pair's matches are used only when that post is the person's half of the counted pair; otherwise the post's matches fill by the bigger side.
- A post card saves whether the sender could swap with the owner when it was sent. The suggested first message for a WTT post that matches both ways says "Want to swap?" only then; otherwise it uses the existing one-way line for the bigger side ("You have some I'm after. Open to an offer?" or "I have some you're after. Interested?").
- A post card saved before this change keeps today's wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: Matches added when the builder opens (fill by Can swap pair or bigger side) and Matches of one post (the same rule inside one post).
- `web-chat`: Suggested first line (both ways reads as a swap only when the card says the two can swap).
- `web-trade-browse`: Make offer on a post, and `web-trade-for-you`: Make offer to a partner (both now point to the fill rule instead of "swaps and sales alike").

## Non-goals

- No change to which matches the row counts, its chip, rings, list counts, or the Can swap ranking.
- No change to what may be sent: the pickers still offer every list on Trade, so a sender can add the side or the matches left out.
- No change to near matches in the builder, the added-matches line's wording, Remove matches or Undo.
- No new message strings.
- No change to post cards already sent.

## Routes

`/trade` (Browse) and `/trade/for-you` (Make offer on a row and on a post), and `/messages` (Make offer from a conversation, and the first-message suggestions).

## Impact

- `packages/api`: `suggestOffer` (`services/offer/picker`) narrows the matches by the person's counts; a pure narrowing beside `lib/offer-prefill.ts`; `savedMatch` (`services/chat/cards.ts`) saves `canSwap` on the stored match, and `storedMatchSchema` gains it as optional.
- `apps/web`: `forPost` (`features/chat/thread/suggestions.ts`) reads `canSwap`.
- Tabs open before the deploy get the narrowed fill from the server at once; their first-message suggestion follows the old rule until reloaded.
- Visual: https://claude.ai/artifact/V5Nt4St8cjJSCQq1SoYqBa
