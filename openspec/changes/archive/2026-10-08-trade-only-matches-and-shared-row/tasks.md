## 1. Only matches: API

- [x] 1.1 Add `matches: z.boolean().optional()` to `browseInputSchema` (`packages/api/src/schemas/trade.ts`). Verify an input without it still parses (older tabs); `@repo/api` lint, typecheck and build pass.
- [x] 1.2 Add a pure `matchesViewer(match)` to `lib/trade-feed.ts` (true when either count is above zero), with cases in `lib/trade-feed.test.ts`: both zero, one side only, both. Verify `bun test packages/api/src/lib/trade-feed.test.ts` passes; lint, typecheck and build pass.
- [x] 1.3 In `services/trade-feed.ts`, pass `matches` and the viewer's want and have slug sets into `fetchFeedRows`, and add the role-aware `EXISTS` from design decision 3 when `matches` is set and either set is non-empty (`= ANY($n::text[])`, one parameter per set). In stage 2, skip posts where `matchesViewer` is false. Ignore `matches` for a signed-out viewer or an empty index. Verify against the local DB as shah:
  - `trade.browse {matches: true}` returns only posts whose match line is non-zero;
  - its first page holds up to 24 posts in bump order;
  - paging with `nextCursor` continues without repeats;
  - `{}` is unchanged.

  `@repo/api` lint, typecheck and build pass.

## 2. Shared card

- [x] 2.0 Shrink the thumbnails: `THUMB_GRID` becomes `minmax(3.5rem)` and `sm:minmax(5.5rem)`, and `PREVIEW_LIMIT` goes from 8 to 11 and moves to `packages/api/src/schemas/trade.ts`, since import protection keeps `lib/` out of the client. Update any `lib/trade-feed.test.ts` case that counts 8. Verify that at 1280 px a 20-objekt side shows 11 thumbnails and +9 in one row, that at 390 px it runs 5 to a row, and that `bun test` passes; lint, typecheck and build pass for both packages.

- [x] 2.1 Add `MatchLine` (`features/trade/match-line.tsx`) and the en/ja/ko keys `trade_match_they_have`, `trade_match_you_have` and `trade_match_mutual`, in the order They have · You have · Mutual, each shown only above zero, with an optional popover trigger. Remove `trade_match_you_want` and `trade_count_*`. Verify web typecheck (Paraglide compiles) and lint pass.
- [x] 2.2 Add `TradeCard` (`features/trade/trade-card.tsx`) with:
  - a header (avatar, name linking to the profile, socials, `TrustLine`, a meta slot);
  - top-right actions that move to their own row below `sm`;
  - the match line, plus a slot after it;
  - a body slot.

  It reuses `MessageButton`, `MakeOfferButton` and `SafetyMenu`, and keeps "Not taking messages" in place of the two buttons. Verify web lint, typecheck and build pass.
- [x] 2.3 Give `SafetyMenu` an `extraItems` prop rendered above Block. Verify existing callers render unchanged (chat thread menu, profile) and web lint, typecheck and build pass.

## 3. Browse

- [x] 3.1 Rebuild `BrowsePost` on `TradeCard`:
  - meta line: the tag and the bump time;
  - after the match line: See in For you, when mutual;
  - body: the post's sides, as today.

  Verify at `/trade` (1280 and 390) that a post matches the after mock-up: match line "They have 14 you want · You have 2 they want · Mutual 2 · See in For you", the popover still opens from the counts, rings unchanged. Web lint, typecheck and build pass.
- [x] 3.2 Add `matches` to `browseSearchSchema` (`1`, read from the URL's string `"1"`) and `toBrowseInput`, with a test in `browse-search.test.ts` that `?matches=1` maps to `matches: true` and that junk is dropped. Verify `bun test apps/web/src/features/trade/browse-search.test.ts`; web lint, typecheck and build pass.
- [x] 3.3 In `browse-view.tsx`, add the labelled Only matches `Switch` beside the Type tabs. It shows only when `useUserLists()` holds a want list, or a have or sale list with a bound profile. Add the empty state "No posts match your lists" with a control that turns the switch off. Add the en/ja/ko text. Verify in the browser:
  - signed out, and signed in with no qualifying list, show no switch, and `?matches=1` lists every post;
  - as shah, on writes `matches=1` and the feed narrows, and combined with WTB it narrows further;
  - load more continues.

  Web lint, typecheck and build pass.

## 4. For you

- [x] 4.1 Replace `PartnerRow` with `PartnerCard` on `TradeCard`. Meta line: the matched lists with `ListRoleBadge`, then Idle when idle. Body: "They have, you want (N)" and "You have, they want (N)", 11 objekts then a +N tile, a section left out at zero, then a closed Not counted `Collapsible`. Verify at `/trade/for-you` (1280 and 390) that the first card matches the after mock-up with no click needed. Web lint, typecheck and build pass.
- [x] 4.2 Move Hide into the card's ⋯ menu via `extraItems`. Rename the offer button to Make offer, keeping the `suggestFor` prefill. Remove `offer_propose` if it is now unused. Verify that Hide removes the card and Not shown can unhide it, and that Make offer opens the builder pre-filled with the overlap. Web lint, typecheck and build pass.
- [x] 4.3 Make `for-you-view.tsx` list cards in a `flex-col gap-4` stack. Keep the `partner` scroll, adding the 2 s highlight (no fade under reduced motion). Verify that `/trade/for-you?match=mutual&partner=<tester id>` scrolls to and highlights trade.tester's card. Web lint, typecheck and build pass.

## 5. Specs and checks

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`, then take 1280 and 390 screenshots of both tabs and compare them with the mock-ups. Verify there is no horizontal scroll at 390 and no console errors.
- [x] 5.2 Run `openspec validate trade-only-matches-and-shared-row --strict`, and confirm both deltas still describe what shipped.
