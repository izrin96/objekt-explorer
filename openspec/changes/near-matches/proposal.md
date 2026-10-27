# Proposal

## Why

sodalove wants JiWoo D337Z and the viewer holds it, yet the row says nothing: sodalove's want list is Buying only and the viewer's copy is on a have list, which only swaps. The picker's "Only what they want" does show it, so the two seem to disagree. The defaults (want lists Swaps only, sale lists Sell only) make this common. The counting rules are right; what is missing is showing what almost matched and how to make it count.

## What Changes

- **Near match:** a collection that would count if one side were open the other way, named by what the viewer would do:
  - their want is Buying only and the viewer's copy is on a have list: "if you sell";
  - their want is Swaps only and the viewer's copy is on a Sell only sale list: "if you swap";
  - their have list holds it and the viewer's want is Buying only: "if you swap";
  - their Sell only sale list holds it and the viewer's want is Swaps only: "if you buy".
- **Never counted:** no count, chip, Can swap, order or alert changes, and no response changes a count or ranking.
- **Trade strips:** a muted dashed ring after the ringed objekts, and "1 more if you sell" (or swap, or buy) after the count. The "Matched with your lists" popover names the viewer's list behind it; the "+N" dialog rings it dashed with a key.
- **Objekt drawer:** one line says why it isn't counted, and a link fixes it: Add to list on the viewer's sale lists, or the post composer on the list whose Open to decides it.
- **Offer builder:** matches are added as before; "1 more if you sell: JiWoo D337Z" offers **Add it**, and a sell or buy near match opens the top-up with the payer set. The drawer offers **Make offer with it**. The picker tags near copies "If you sell" (or swap, or buy).
- **Show my matches:** near matches dashed after the matches; the count is unchanged.
- **Matching help:** a "Dashed ring" row in Good to know.

## Non-goals

- Changing what counts as a match, or any list's Open to.
- Near matches in chat post cards, chat reply suggestions, notifications or want alerts. `/api/v1` mounts `trade.people` and `trade.sideItems`, so its schema gains the same additive `near` fields, which hold only the caller's own list ids.
- Near matches through a want list's rules, on either side: RULE tiles show no near count, and a collection the viewer wants only through a rule is never near.
- Setting a top-up amount from a sale list's price.

## Routes

`/trade`, `/trade/for-you`, someone's list page (`/@<nickname>/list/<slug>`, `/list/<slug>`), and the offer builder wherever it opens from those pages.

## Capabilities

### New Capabilities

- `web-trade-near-matches`: what a near match is, that it is never counted, and how it shows on Trade strips, their popover and dialog, the objekt drawer, the offer builder and picker, the list page's Show my matches, and the matching help.

### Modified Capabilities

None. Every existing requirement still holds as written: the new capability only adds marks beside them.

## Impact

- `packages/api`: the feed, side-items, list-match, suggest and picker reads gain additive near fields; a cached value whose shape changes bumps its key.
- `apps/web`: strips, dialog, popover, drawer, builder, picker, Show my matches, help; en/ko/ja messages.
- Depends on `offer-prefill-matches` (matches added when the builder opens), which should be archived first.
- No schema change and no migration.
