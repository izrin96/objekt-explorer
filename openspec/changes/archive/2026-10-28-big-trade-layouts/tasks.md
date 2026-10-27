# Tasks

## 1. Status, grouping and narrowing (pure)

- [x] 1.1 Add `features/offers/exchange.ts`: `legStatus` (built on `legChip`, plus `needsYou` and the stuck and away warnings), `exchangeGroups` (spec order; filters All, Needs you, Waiting, Verified; find by member or collection code; Send these split by `heldBy` when it names more than one profile, any-copy legs last), and `needsYouCount`. Verify with `exchange.test.ts`: Needs you counts owed and different-copy legs, find matches member and code case-insensitively, profile groups appear only for two or more profiles, empty groups drop out. Also verify `bun run --filter=web lint`, `typecheck` and `test` pass.
- [x] 1.2 Fold same-day transfers in `timelineRows` (`trade-clock.ts`) into a `sentGroup` row per party, keeping a lone transfer as `sent`. Export the local-day helper from `next-step.ts` rather than copying it. Verify with new cases in `trade-clock.test.ts`: 14 of the user's transfers on one day make one group, a single transfer stays a row, and the two parties never share a group. Also verify the web checks pass.

## 2. Server: who holds what the viewer owes

- [x] 2.1 Add optional `heldBy: { address, name } | null` to the trade leg view in `packages/api/src/schemas/offer.ts`. Fill it in `services/offer/trades.ts` for the viewer's open legs that name a specific objekt, only when the viewer has two or more linked addresses. Use one indexer read of those ids' `owner` and the viewer's `user_address` names. Verify with `bun run --filter=@repo/api typecheck` and `test`, and by loading a local trade as a two-profile user (read-only), where the owed legs carry their profile and the others carry null.

## 3. Shared tile

- [x] 3.1 Add `features/offers/objekt-tile.tsx`: `OfferThumb` plus a caption, with an optional status mark (icon and colour per `legStatus`, named to assistive technology), `×N`, a problem outline and a corner slot for a button. It renders as a pressable `<button>` or a plain figure. Verify it in all three surfaces in groups 4–6, and that `bun run --filter=web lint` and `typecheck` pass.

## 4. Trade page

- [x] 4.1 Replace `TradeLegs`/`LegCard` with The exchange: side headings with counts, grouped `ObjektTile` grids, filter chips with counts, Grid/List switch, find box, empty-filter message with Show all. State lives in `TradeDetail`. Delete `trade-legs.tsx` and `leg-card.tsx` once unused. Verify on the local dev server (read-only) with a trade of two or more legs per side, that a 40-leg layout fits as specified (the mockup's data, if no local trade is that large), and that the web checks pass.
- [x] 4.2 Add the Selected panel: the first card of the side panel from `lg`, a `Sheet` below it with focus back on the card. Show away and stuck lines with `offer_leg_away` and `offer_leg_stuck`, plus the different copy's sent serial and View objekt. Verify in the browser at 1440 and 390 px, and that the web checks pass.
- [x] 4.3 Add "Show the N that need you" to the status card in `next-step-banner.tsx`, which sets Needs you and scrolls to The exchange, hidden when N is 0. Verify on a your-turn trade and a their-turn trade, and that the web checks pass.
- [x] 4.4 Phone layout: the You give and You get tablist below `sm`, opening on the side that needs the viewer; four tiles a row; bottom bar as 4.7 leaves it. Verify at 390 px with no sideways scroll, and that the web checks pass.
- [x] 4.5 Render `sentGroup` rows in `TradeTimeline` as a collapsible row listing each transfer's objekt, serial and hash link. Verify on a local trade with two transfers by one party on the same day, and that the web checks pass.
- [x] 4.6 Add en, ko and ja messages for the chips, group headings, profile headings, find box, Selected panel, Show the N and the folded Timeline row. Verify that `paraglide:compile` succeeds, the three locales hold the same keys, and the ko page at 390 px doesn't overflow.
- [x] 4.7 Drop Copy address: `Primary` in `next-step.ts` becomes `"decide" | null` with your turn returning `null` (update the `next-step.test.ts` case), delete `CopyAddressButton`, make `SendTo` (`next-step-banner.tsx`) show "Send to <nickname> in Cosmo" with each `also` profile after "or" (shortened address for a null nickname), and remove the phone bar's branch in `trade-view.tsx`. Keep `offer_copy_address`, which the Trading with card and the moderation console use. Add en, ko and ja messages for the Send to line. Verify a your-turn trade at 1440 and 390 px, with a partner of one profile and of two: "Send to" names their nicknames with no button, Open chat is the one filled button in the Trading with card and in the bar, and the web checks pass.

## 5. Offer card in chat

- [x] 5.1 Turn `OfferSideList` into a tile grid: side count in the label, eleven tiles and "+N" past twelve rows, `×N` from `groupRows`, a tile opening the drawer. "+N" and the count open a `Sheet` listing every row with its serial. Verify in a local thread with an offer of more than twelve per side (local test data only, with the user's approval), at 1280 and 390 px, and that the web checks pass.
- [x] 5.2 Add "give ⇄ get" counts to the collapsed line's `ThumbStrip` when a side holds more than three. Verify on a collapsed large offer, and that the web checks pass.

## 6. Offer builder

- [x] 6.1 Swap `SideColumn`'s rows for an `ObjektTile` grid in a `max-h` scroller, six a row at full width and four on a phone, with a remove button per tile. Verify in the browser with 20 or more picks a side that the top-up, note and Send stay on screen, and that the web checks pass.
- [x] 6.2 Add the blocked-picks banner per side with Remove them (`onRemoveMany`, applying `takeOut` per key) and outline blocked and refused tiles with their reason. Verify by asking for an objekt then making it unlisted locally (read-only for production), and by a `quantity.test.ts` case for removing several keys that include a resolved copy. Also verify the web checks pass.

## 7. Integration

- [x] 7.1 Run `bun run check` and `bun run build` from the root. Walk through the trade page, the offer card and the builder at 1440 and 390 px in en and ko on the local dev server, recording any production check as read-only verified.
- [x] 7.2 Update `apps/web/AGENTS.md`'s Trade page section to name `exchange.ts` beside `next-step.ts` and `trade-clock.ts` as where a leg's status, grouping and narrowing live, and update `packages/api/AGENTS.md` if `heldBy` adds a trap. Otherwise state that no other package's conventions changed.

## Workflow follow-up

- Archive `broken-leg-grace` before this change.
- Archive this change after review, then confirm `openspec/specs/web-verified-trades/spec.md` holds both changes' requirements.
