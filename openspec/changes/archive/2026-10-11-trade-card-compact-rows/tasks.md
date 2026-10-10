## 1. Shared parts

- [x] 1.1 Create `features/trade/match-chip.tsx` (`MatchChip`, plus `MATCH_TONE` moved from `match-line.tsx`) per design decision 1. Add messages `trade_chip_mutual` ("mutual {mutual} · {theyHave} ⇄ {youHave}") and `trade_chip_counts` ("{theyHave} ⇄ {youHave}") to `messages/{en,ja,ko}.json`. Verify the visible text is `aria-hidden` and the `sr-only` text uses the existing count messages.
- [x] 1.2 Create `trade-header.tsx` (avatar, name, socials, `TrustLine`, `SafetyMenu`, and an `end` slot) and `trade-actions.tsx` (Message, primary Make offer, or "Not taking messages", with a `compact` icon-only Message). Add `variant` / `size` / icon-only support to `MessageButton` / `MakeOfferButton` if they lack it. Verify lint, typecheck and build pass for `web`.

## 2. For you rows

- [x] 2.1 Add the compact form to `MatchObjekt` in `match-grid.tsx` (3rem thumbnail with `hideLabel`, a two-line mono caption, and a not-counted form with a strike and reason), and a compact column wrapper that shows the "+N" tile after 11. Verify an unknown collection still shows its `SlugTile` with the right radius.
- [x] 2.2 Replace `partner-card.tsx` with `partner-row.tsx`. It is a bordered `bg-card` row; a header with `TradeHeader`, `end` = `MatchChip` + "N lists" popover button (list badges and links moved from meta) + idle label + chevron; and a `Collapsible` panel holding the two-column body (`grid gap-4 sm:grid-cols-2 sm:ps-12`, headings in `MATCH_TONE`, mono uppercase `text-xs`), inline not-counted items (at most 4 per column) and the footer (hint line, Hide partner ghost button, `TradeActions`). Remove the "Not counted" collapsible and Hide from ⋯. Keep "also known as" in the header under the name.
- [x] 2.3 In `for-you-results.tsx`, hold the toggled-ids `Set` and derive open as `!idle !== toggled.has(id)`. Open a closed `partner=` target without an effect, and keep the highlight. Render `PartnerRow`. Verify a `?partner=<idle id>` link opens and highlights that row. Verify lint, typecheck and build pass for `web`.

## 3. Browse posts

- [x] 3.1 Turn `post-side.tsx` into `PostStrip`: mono role label in the list type tone, at most 10 `w-10` thumbnails (wrapping) with rings and sale price captions, and a "+N" tile. Verify a 20-entry side shows 10 + "+10".
- [x] 3.2 Rewrite `browse-post.tsx` as the compact card: `TradeHeader` with `end` = `TagBadge`s; the anchor list name and a one-line description; strips; `MatchChip` (popover kept) + See in For you link; and a footer with a mono `<time>`, compact `TradeActions` (none for own posts). Update `BrowsePostSkeleton` to match.
- [x] 3.3 In `browse-view.tsx`, chunk posts into pairs for `WindowVirtualizer` (`grid gap-4 lg:grid-cols-2 items-stretch` per pair), set `ssrCount` to `Math.ceil(SSR_POSTS / 2)`, and render the pending skeletons in pairs. Verify the first page is server-rendered (view source shows posts) and infinite loading still works. Verify lint, typecheck and build pass for `web`.

## 4. Clean-up

- [x] 4.1 Delete `trade-card.tsx`, `match-line.tsx` and `partner-card.tsx` once nothing imports them. Drop unused messages (`trade_match_mutual` only if unused, plus the `trade_not_counted` collapsible label) from en/ja/ko. Verify `bun run knip` reports no new unused exports, and that lint, typecheck and build pass for `web`.

## 5. Verify

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 5.2 Browser check at 1280px and 390px, light and dark, on `/trade` and `/trade/for-you`, signed in and signed out (Browse). Read-only: open popovers and the offer builder, but don't send anything. Record:
  - Browse is 2 per row at 1280 and 1 at 390, with strips wrapping inside the card;
  - chips read `mutual M · A ⇄ B` / `A ⇄ B`, and VoiceOver reads the full counts;
  - For you rows are open (idle closed), with the two columns side by side at 1280 and stacked at 390;
  - not-counted items are struck through with the footer hint;
  - Hide partner is in the footer, and ⋯ has Block and Report;
  - nothing scrolls sideways.

### 5.2 results (dev server, signed in as the smoke account, read-only; Browse also fetched signed out)

- Browse: 2 per row at 1280, 1 at 390; strips show up to 10 thumbnails + "+N" and wrap inside the card; no sideways scroll.
- Chips read `mutual 2 · 14 ⇄ 2` and `0 ⇄ 7`, with the three count sentences in `sr-only` text. **Not run with VoiceOver.**
- For you: active rows open, idle closed; two columns side by side at 1280 and stacked at 390; chevron toggles without moving rows above it; `?partner=<idle id>` opens, scrolls to and highlights the row; "See in For you" from Browse lands on the row.
- One not-counted item is struck through with its reason and the footer hint.
- Hide partner is in the footer; ⋯ holds Block and Report…; the "N lists" popover and the chip popover open; the offer builder opens (nothing sent).
- Light and dark checked at both widths. Signed-out Browse checked through the server render only (posts, no chips).
