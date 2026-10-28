# Design

## Context

`suggestOffer` (`packages/api/src/services/offer/picker/index.ts`) reads the person through `recountPartners` under the row's Compare with sides, then narrows the matches only by a post's lists (`matchesThrough` with `postListsOf`'s `offerIds` / `wantIds`) and fills every match left, both sides. Since `can-swap-per-post`, each recounted partner carries `posts` (both sides' post keys), and its matches carry `swapMyListIds` / `swapPartnerListIds`; `matchCounts` returns `swap` and `swapPair` (`{ myListIds, theirPostId }`, the counted pairing), which is what the row's chip reads.

The first-line suggestion (`forPost`, `apps/web/src/features/chat/thread/suggestions.ts`) reads the post card's saved match, `{ ownerHas, senderHas }` (`storedMatchSchema`, `schemas/chat.ts`), written once by `savedMatch` (`services/chat/cards.ts`) from `personDetail`, whose counts already carry `swap`.

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- The builder fills by the same pairing the chip reads, so an offer never pairs two of the viewer's posts unless the person is Can swap through one pair.
- The narrowing is pure and tested beside `chooseMatchPicks`; `suggestOffer` only feeds it.

**Non-Goals:**
- No change to `recount`, the candidate query, or the picker's lists and tags; `matchCounts` changes only in decision 5's tie-break.
- No change to near matches (`personNear`, `nearPicks`): they still follow the strips.

## Decisions

**1. One pure narrowing.** Add `fillMatches` to `lib/offer-prefill.ts`: it takes the partner's two match lists, its `posts`, the `swapPair` from `matchCounts`, and the post's list ids when the builder opened on a post. It returns `{ get, give }`:
- when `swapPair` is set and either no post was named or the post's offering list is `swapPair.theirPostId`: the swap matches whose `swapMyListIds` include one of `swapPair.myListIds` and whose `swapPartnerListIds` include a list keyed to `theirPostId`, each with `myListIds` and `partnerListIds` cut to the pair's lists, so `itemsOnLists` and `myCopies` take copies from the pair's lists only;
- otherwise: the matches through the post (or all of them), and only the side with more distinct collections; on a tie, `get`.
`suggestOffer` calls it in place of the two `matchesThrough` calls and reports `matched` from what it returns, so the line never counts a side it left empty. Alternative: narrow in the web from the row's data; rejected, since the conversation path has no row and the server already holds the recount.

**2. Can swap is read from the same recount.** `suggestOffer` runs `matchCounts(partner)` on the partner it already recounted, under the same sides the row used (`resolveCompareSides(me, list, mutual)`). No second read.

**3. The card saves `canSwap`.** `savedMatch` adds `canSwap: mutualOf(partner.counts) > 0`; `storedMatchSchema` gains `canSwap: z.boolean().optional()`, so cards already stored still parse. `forPost` treats `canSwap === false` with both counts above zero as one way for the larger side (owner's on a tie), reusing `chat_suggest_they_have_*` / `chat_suggest_you_have_*`; a missing value keeps "Want to swap?". Alternative: recompute at read time; rejected, since the card is a snapshot by design (the match saved with it stays as saved).

**4. No new strings, no component.** The builder's line already words a one-sided fill ("Added 2 you get from your matches", "Added from doubles: 2 you get"); the first line reuses its one-way suggestions.

**5. A full tie between pairings is broken by post key.** `swapScore` kept the first of two pairings with equal `swap` and `swapTheyHave`, and that order comes from an unordered `json_agg` in `candidates.ts`. The row reads a cached recount and `suggestOffer` a live one, so the builder could fill a different pair than the row counted. The tie now goes to the lowest `theirPost`, then the lowest `myPost`. The score itself is unchanged, so no ranking cache version moves.

## Risks / Trade-offs

- [A person matched both ways only through sales ("No swap · buy or sell") now gets one side, where today's builder held a buy and a sell together] → the pickers still offer both sides; such offers are rare and pay a top-up the sender sets anyway.
- [The dropped side is not mentioned in the line] → accepted for now; the row's header sentence still shows both counts right beside Make offer.
- [Tabs open before the deploy keep the old first-line rule until reloaded] → the fill itself comes from the server and is right at once.

## Migration Plan

No database change: `canSwap` rides in the existing `message.card` jsonb, optional. Deploy web and API together; rollback is a redeploy, and cards written with `canSwap` still parse under the old schema, which strips the field.
