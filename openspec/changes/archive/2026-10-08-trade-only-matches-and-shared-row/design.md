## Context

See proposal.md for why.

**Browse.** The feed (`services/trade-feed.ts`, `browseFeed`) runs in two stages:
- **Stage 1** (`fetchFeedRows`) picks up to 36 post rows in bump order with plain SQL filters (type, collection slugs, blocks, hidden partners, trade blocks).
- **Stage 2** loads those posts' entries, drops the objekts the owner no longer holds, and fills the page up to 24. Posts left empty are skipped, and the cursor continues from the last row examined.

The viewer's match index comes from `fetchViewer`: their bound have lists, ownership-checked and cached, and their want lists. `assemblePost` turns it into each post's `match.youHave` and `match.youWant`.

**For you.** `partner-row.tsx` is a Base UI Collapsible:
- **Closed**, it shows avatar, name, reputation and the counts "Mutual · They have · You have".
- **Open**, it shows the profile link, socials, their lists, the two match grids, the not-counted grid, then Message, Propose this trade, Hide and ⋯.

For you lists at most 50 partners.

**Browse cards.** `browse-post.tsx` draws the open card that both tabs will now use. Both files already share `THUMB_GRID`, `TrustLine`, `ListRoleBadge`, `MessageButton`, `MakeOfferButton` and `SafetyMenu`.

**Mock-ups.** Before and after screenshots at 1280 and 390 px were made against local data by restyling the live page with the app's own CSS. They were shown to the user for review and are not kept in the repo.

## Goals / Non-Goals

**Goals:**
- One card component with header, actions, match line and body slots, used by both tabs.
- Only matches decided in stage 1 SQL, so a page fills from matching rows, with stage 2 as the exact check.

**Non-Goals:**
- Reworking the feed's two stages or its cache.
- Virtualising For you's list: 50 cards with lazy thumbnails is within what Browse already renders.

## Decisions

**1. A `TradeCard` shell, filled by each tab.** `features/trade/trade-card.tsx` lays out the header, the actions slot, the match line and the body. The parts that differ are passed in:
- the meta line;
- the extra items in the ⋯ menu;
- what follows the match line;
- the sections.

`BrowsePost` and a new `PartnerCard` (replacing `PartnerRow`) both render it. Alternative considered: make `BrowsePost` accept a partner. Rejected, because a post and a partner have different data and differently built actions (list target vs user target with a prefill). Branching inside one component would spread `if (post)` throughout. The shell keeps one layout and two small adapters.

**2. `MatchLine` is one component.** It takes `{ theyHave, youHave }` and an optional popover. On Browse the counts open the matched-lists popover as today. On For you the meta line already names the lists, so the counts are plain text. Mutual is computed (`min`), never passed in, so the two tabs can't disagree. Its messages replace `trade_match_you_have`/`_you_want` and `trade_count_*`:
- `trade_match_they_have`: "They have {count} you want";
- `trade_match_you_have`: "You have {count} they want";
- `trade_match_mutual`: "Mutual {count}".

The old `trade_count_*` keys are removed.

**3. Only matches in stage 1.** When `input.matches` is set and the viewer has an index, `fetchFeedRows` adds one role-aware `EXISTS` over the post's lists (`posts.id`, `posts.partner_id`). An entry matches when either holds:
- its list is have or sale and its slug is in the viewer's want slugs;
- its list is want and its slug is in the viewer's have slugs (the ownership-checked index).

Stage 2 then also skips posts whose assembled `match` counts are both zero. This catches the case where an owner sold the only matching objekt, which SQL can't see. The existing over-fetch (36 for 24) and the cursor already absorb skipped posts.

An empty index (no lists) returns the plain feed with `matches` ignored. This mirrors the hidden switch, so a stale `?matches=1` never yields an empty page.

Alternative considered: filter in stage 2 only. Rejected, because with a sparse match rate one page would examine 36 rows and return 2.

The slug arrays are sent as one parameter each (`= ANY($n::text[])`), as `hasEntryIn` already does.

**4. URL key `matches`, not `match`.** `match=mutual` is an old For you-style key that Browse ignores on purpose (spec scenario Old link). A different key keeps that rule simple. `browseSearchSchema` gains `matches`, the literal `1`, preprocessed from the string `"1"` because the app's search parser keeps every URL value a string. `toBrowseInput` passes `matches: true`, which joins the query key, so on and off are cached apart. The API input gains `matches: z.boolean().optional()`, a new optional field, so older open tabs' `/rpc` calls still validate.

**5. The switch is shown from the user's lists.** Browse already reads `useUserLists()` for the popover. The switch shows when one of those lists takes part in Trade: a want list, or a have or sale list with a bound profile. This needs no new request. It uses the vendored `Switch` from `components/ui`, with a visible label.

**6. For you cards always open.**
- `partner=<id>` scrolls to the card. The existing `scrollIntoView` effect is kept. A `data-highlight` attribute fades a ring for 2 s; under reduced motion the ring shows without fading.
- Not counted stays collapsible inside the card body (`Collapsible`, closed by default), since it is diagnostic.
- Hide joins `SafetyMenu` through a new `extraItems` prop, rendered above Block, rather than as a second menu.

**7. Smaller thumbnails, one row.** `THUMB_GRID` goes from `minmax(4rem)` and `sm:minmax(7rem)` to `minmax(3.5rem)` and `sm:minmax(5.5rem)`. At 1280 px the card's content is about 1,208 px wide, so 12 columns fit (88 px plus an 8 px gap). `PREVIEW_LIMIT` goes from 8 to 11 and moves to `schemas/trade.ts`, beside `CARD_LIMIT`: import protection keeps `lib/` out of the client, and For you's sections use it too. With the +N tile, a full section is exactly one row on desktop; at 390 px it is 5 to a row. Captions stay `text-xs` and may wrap to two lines at 88 px, which `ObjektCard` already handles. Alternative considered: keep 8 and shrink only. Rejected, because the user asked to fit more, and shrinking alone leaves a row a third empty.

**8. Make offer label.** The For you button uses the default `m.offer_make()`. `offer_propose` is removed once nothing else uses it.

## Risks / Trade-offs

- [For you is much longer: up to 50 open cards instead of 50 one-line rows] → Thumbnails are smaller, lazy and capped at 11 per section, one row each on desktop, which is Browse's density, so Browse's page weight is already accepted. The mock-ups showed this, and the user judges it before apply.
- [Only matches over-fetch: a viewer whose stage-1 matches are mostly sold-out can still get a short page] → The cursor continues and "load more" fills the rest. This is the same behaviour as today's ownership skip.
- [Removing For you's collapse loses the quick scan of 50 names] → The match line sits under each name and the cards are sorted mutual-first, so the top of the page carries the best partners.
- [`SafetyMenu` gains a slot used by one caller] → It is a small prop, kept over a second ⋯ button, so each card keeps one menu.

## Migration Plan

Web and API ship together. `matches` is optional, so the old web against the new API, or the reverse, both work. No data migration. Roll back by reverting.
