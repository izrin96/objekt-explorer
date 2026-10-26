# Design

## Context

See proposal.md for why. Today:

- `TradeLegs` (`features/offers/trade-legs.tsx`) draws each leg as a `LegCard`: a 112 px `OfferThumb`, four text lines and a `StatusBadge` chip. The chip comes from `legChip` in `next-step.ts`, and the side line from `sideStatus`. `broken-leg-grace` (committed, not archived) adds `leg.away` and an away line to `LegCard`.
- `TradeTimeline` renders `timelineRows` (`trade-clock.ts`), which pushes one `sent` row per verified leg.
- `OfferSideList` draws the first six rows of a side, with "Show N more", and `OfferCard`'s collapsed line keeps up to three thumbnails a side.
- `builder/side-column.tsx` draws each pick as a bordered row. Its reasons come from `reasonOf` in `builder/form.tsx`, and the footer hint already says to remove what can't be offered.
- Thumbnails already lazy-load: `ObjektArtwork` sets `loading="lazy"` for the thumbnail image `OfferThumb` uses. Nothing here changes that.
- A leg view carries no address. `trade_leg.from_addresses` is every address linked at accept, not the one holding the objekt now.

## Goals / Non-Goals

**Goals:**
- Every rule about status, grouping and narrowing lives in pure modules with tests. Components only render.
- One small-card component serves the trade page, the offer card and the builder.

**Non-Goals:**
- Virtualisation. A side holds at most 50 legs (`OFFER_SIDE_LIMIT`), and a CSS grid of 50 thumbnails is cheap. `VirtualCardGrid` needs a fixed-height scroller the page doesn't have.
- URL state for the exchange's filters. They are a view of one visit, and the spec says they reset.

## Decisions

1. **`exchange.ts`, pure, beside `next-step.ts`.** It holds:
   - `legStatus(leg, ended)`: `legChip`'s statuses plus `needsYou`, with `stuck` and `away` as warnings;
   - `exchangeGroups(legs, { filter, find, collections })`: groups in spec order, with the counts the chips show;
   - `needsYouCount(trade)` for the status card.

   `legChip` stays the single source of a leg's status, and `exchange.ts` builds on it. `sideStatus` is unchanged. Tests go in `exchange.test.ts`.
   *Alternative:* group inside the component. Rejected: the rules need tests, and tests cover pure modules only.

2. **One `ObjektTile` component** (`features/offers/objekt-tile.tsx`). It's an `OfferThumb` plus a caption, with an optional status mark, `×N`, an outline for a problem, and a corner slot for a button. On the trade page it's a `<button aria-pressed>`, so it can be selected. In the offer card it opens the drawer; in the builder the slot holds the remove button.
   *Alternative:* extend `CandidateTile`. Rejected: that tile carries picker-only logic (stepper, open-offer flags, `role="button"` for WebKit's aspect-ratio bug), and these surfaces need none of it.

3. **The exchange's state lives in `TradeDetail`** as plain `useState`: the filter, the find text, the view, the selected leg id and the phone tab. "Show the N that need you" sets the filter and scrolls The exchange into view. The phone tabs are two buttons in a `role="tablist"`, with the inactive side hidden by `max-sm:hidden`. The tablist sits inside `sm:hidden`, so `sm` and up still show both sides with no media query and no hydration mismatch.

4. **Selected panel.** From `lg` it's the first card of the side panel. Below `lg` the same content opens in the vendored `Sheet`, using its focus return. Away and stuck text come from the existing `offer_leg_away` and `offer_leg_stuck` messages, so the wording stays as `broken-leg-grace` wrote it. `LegCard` and `TradeLegs` are removed once nothing renders them.

5. **`heldBy` on the leg view**, server side in `services/offer/trades.ts`. It applies only to the viewer's own open legs that name a specific objekt, and only when the viewer has two or more linked addresses. One indexer read of those objekt ids' current `owner`, matched to the viewer's `user_address` rows, gives `{ address, name }`. It's null otherwise, including for any-copy legs. It's an optional output field, so `/rpc` inputs don't change. `exchangeGroups` splits Send these by it.
   *Alternative:* use `fromAddresses[0]`. Rejected: that's the accept-time list, not where the objekt is now.

6. **Timeline folding in `timelineRows`.** `sent` rows with the same `fromYou` and the same local day (the `localDay` helper `next-step.ts` uses) fold into one `sentGroup` row holding its legs. A group of one stays a `sent` row. `TradeTimeline` renders a group as a `Collapsible` whose panel lists each transfer with its serial and hash link. Tests extend `trade-clock.test.ts`.

7. **Offer card.** `OfferSideList` becomes a grid of `ObjektTile`s, using `groupRows` for `×N`: eleven tiles and a "+N" tile when a side's rows exceed twelve. "+N" and the side's count open a `Sheet` with every row as a line (`ItemLabel`, serial in mono per Objekt data in monospace). `ThumbStrip` adds "give ⇄ get" counts when a side holds more than three. The 448 px stacking rule is unchanged.

8. **Builder.** `SideColumn` swaps its `<ul>` of rows for a grid of `ObjektTile`s inside a `max-h` scroller. A banner above the grid counts the picks whose `reasonOf` or refusal is set. Remove them calls a new `onRemoveMany(keys)`, which applies `takeOut` per key, so a resolved copy takes its ask down as a single remove does. The footer reuses `offer_builder_blocked_hint`.

9. **Send to a nickname; Copy address goes.** Trades are sent in the Cosmo app, which finds the receiver by nickname, so an address and its Copy address button point the sender at the wrong thing. `Primary` in `next-step.ts` becomes `"decide" | null`, and your turn returns `null`. The existing rule then fills Open chat, in the phone bar and in the Trading with card. `SendTo` reads the partner identity the trade view already carries: `nickname` (the default profile) then each of `also` (the other linked profiles, in link order) after "or", since a transfer to any linked address verifies a leg. A profile with a null nickname shows `truncateAddress`. A partner with no linked profile has no `address`, and the row stays hidden as today. `CopyAddressButton` is deleted. No API change. The copy icon beside the partner's name in the Trading with card stays: it is the site's usual copy-beside-a-name, not a send step.
   *Alternative:* keep Copy address and drop only its filled style. Rejected: a button nobody needs still costs a place in a 390 px bar.

## Risks / Trade-offs

- [Status shown by a mark, not a word, on a 76 px card] → each mark pairs a distinct icon with its colour, the tile's accessible name ends with the status, List view spells it out, and the group headings carry the words.
- [Dimmed verified art reads as disabled] → only the art dims; the caption keeps full contrast, and the card stays selectable.
- [`heldBy` adds an indexer read to every trade page load] → it runs only for a viewer with two or more linked addresses and owed specific legs, and it's one `IN` query on `objekt.id`.
- [`broken-leg-grace` edits `leg-card.tsx`, which this change retires] → its away line moves into the Selected panel and the warning mark. Archive `broken-leg-grace` before this change, so `web-verified-trades` has its requirements first.
- [Requirement text elsewhere still says "chip"] → Verification progress mentions the legs' chips. The marks keep those colours, so the wording stays true enough; it can be tidied at archive.

## Migration Plan

No database change. Deploy the API before or with the web: an old web ignores `heldBy`, and a new web treats a missing `heldBy` as null.
