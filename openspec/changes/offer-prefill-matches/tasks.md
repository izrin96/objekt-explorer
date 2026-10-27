# Tasks

## 1. Choosing the copies (pure)

- [x] 1.1 Add `packages/api/src/lib/offer-prefill.ts` with `chooseMatchPicks(give, get)`: one item per slug in match order, up to `OFFER_SIDE_LIMIT`, with each side's `matched` count before the cap.
  - Give: the highest serial that is transferable and not reserved, preferring an empty `inOpenOffer`.
  - Get: an any-copy item when there is one, otherwise the lowest such serial.
  - A slug with nothing eligible drops out and isn't counted in `matched`.

  Verify with `offer-prefill.test.ts` covering:
  - the highest serial is given;
  - a copy in another open offer loses to one in none;
  - a reserved or non-transferable copy is never chosen;
  - any copy beats a serial on the get side;
  - the lowest serial is asked;
  - the 50 cap, with `matched` at 60;
  - match order is kept.

  Then check that `bun run --filter=@repo/api lint`, `typecheck` and `test` pass.

## 2. Server: the matches the row counts

- [x] 2.1 Rebuild `suggestOffer` on `recountPartners` for the one partner.
  - Resolve the sides with `resolveCompareSides(me, list, mutual)` and keep only matches where `trade` is true.
  - Give: narrow the viewer's candidates to the match's `myListIds`.
  - Get: narrow `theirCandidates` items to the lists in `partnerListIds`.
  - Choose through `chooseMatchPicks`, keeping the safety checks, and return each side's `matched`.
  - Widen `suggestInputSchema` with optional `list`, `mutual` and `post`, and confirm `{ partnerId }` alone still validates.
  - With `post`, resolve the partner's post (the list and its `linkedListId`). Keep get matches through its have or sale list and give matches through its want list, and return the post's list name. A post that isn't the partner's or isn't on Trade gives no matches.

  If the post filter is a pure helper, test it in `offer-prefill.test.ts`. Then, on the local database (read-only), call `offer.suggest` for a partner whose Browse row shows swap counts. Confirm:
  - each side's count equals the row's count for that side, with Compare with off and on;
  - with `post`, each side equals that post's strip counts.

  Verify that `bun run --filter=@repo/api lint`, `typecheck` and `test` pass.

## 3. Builder

- [x] 3.1 Move `WithNumber` from `features/trade/match-summary.tsx` to an exported `features/trade/with-number.tsx` that takes several numbers (`{ give, get }` as well as `count`). `MatchChip` and `MatchCounts` use it unchanged. Verify that the Trade row's chip and counts render as before on local Browse, and that `bun run --filter=web lint`, `typecheck` and `build` pass.
- [x] 3.2 Add `matches?: { partnerId; list?; mutual?; post? }` to `OfferRequest` and `suggestOptions` to `queries.ts` (`staleTime: "static"`, `gcTime: 0`). Add `MatchesBuilder` in `offer-builder.tsx`:
  - It renders `BuilderHeader`, one `role="status"` region that stays mounted until the close, then the body. The region is a plain element in the `lib/tone.ts` tones, not the vendored `Alert`.
  - While the read is pending, the region reads "Adding your matches…", each side is a skeleton, and the footer shows Cancel only, with no hint and no Send.
  - It keeps the region's element through a callback ref, then renders `BuilderForm` with `header={false}`, `region`, a prefill built through `toPick`, and `added` (keys, counts, `matched`, post name). `BuilderForm` renders its line into the region with `createPortal`.
  - On error it renders `BuilderForm` empty, and the region reads the failure in the warning tone.
  - `BuilderRefused` takes the same `header={false}` here.
  - `DialogPopup` takes `initialFocus` on the title.
  - Add `offer_matches_loading` and `offer_matches_failed` (design decision 7) to `messages/en.json`, `ko.json` and `ja.json`.

  Verify in the browser that a request with `matches` shows "Adding your matches…" and the skeleton with no Send or hint, then the picks, that focus starts on the title, and that a screen reader's live-region log (or the DevTools accessibility tree) holds one status node across both. Then check that `bun run --filter=web lint`, `typecheck` and `build` pass.
- [x] 3.3 Add the line, Remove matches and Undo to `BuilderForm`.
  - The line is the progress tone (`TONE_FILL`/`TONE_EDGE` progress, `ArrowsLeftRightIcon`), its numbers through `WithNumber`; the key follows the sides added and whether a post is named, plus the cap sentence for a side whose `matched` is over 50.
  - Remove matches takes the added keys out of both sides through `takeOut`, then the line reads "Took out {count} matches" with Undo, and focus moves to Undo.
  - Undo puts back the taken picks, skipping keys a side already holds, restores the line and moves focus to Remove matches.
  - The "Added…" line goes once none of the added picks remain.
  - `holdsDraft` is false when nothing is on either side and there is no top-up amount or note.
  - Add the other `offer_matches_*` keys of design decision 7 to en, ko and ja: the en strings, and the ko and ja candidates in the app's register (제안 and -습니다 in ko, 件 and 外す in ja).

  Add a `quantity.test.ts` case for removing several keys that include a resolved copy. Verify in the browser:
  - Remove matches keeps a pick the sender added, and Undo brings the matches back;
  - closing an unchanged prefilled builder asks nothing, and closing after Remove matches with nothing left asks nothing;
  - the line uses the progress tint and the failure the warning tint, with no `accent`;
  - the ko line "매칭에서 주는 것 3개, 받는 것 5개를 추가했습니다" with Remove matches fits the builder at 390 px without the sheet scrolling sideways.

  Then check that `paraglide:compile` succeeds, that every new key exists in all three files with the same placeholders, and that `bun run --filter=web lint`, `typecheck`, `test` and `build` pass.

## 4. Where it opens

- [x] 4.1 Pass `matches` from the Trade rows: `TradeActions` takes it, and `PersonRowView` sets `{ partnerId, list, mutual }` when the row has a band, taking `list` and the mode from the route's search. Verify on local Browse and For you, read-only:
  - Make offer on a row with matches opens with the row's counts and the line;
  - a row with no band opens empty, with no status line;
  - Compare with narrows what's added.

  Then check that `bun run --filter=web lint`, `typecheck` and `build` pass.
- [x] 4.2 Add the post ⋯ menu in `PostBlock`.
  - The trigger is a `Button` `ghost` `icon-sm` in an `auto` column of the post's `FramePanel` grid, named `trade_post_menu` with the post's own list.
  - Lift `SideStrip`'s dialog state (`allOpen`, `allMounted`) to `PostBlock`, keyed by list id, so the "+N" tile and Show all of {list} open one dialog.
  - Make offer on this post (`HandshakeIcon`) shows when the row's `contact` is open. It runs `useStartGate().gate()`, then opens the shared builder with the post's list as target and `startList`, and `matches` with `post` only when a strip count is above zero.
  - Own posts and rows not taking messages offer Show all only; a one-post row offers Make offer on this post too.
  - Add the `trade_post_*` keys of design decision 7 to en, ko and ja.

  Verify locally, read-only, at 1440 and 390 px:
  - the menu's items for a WTT post, a WTB post, a Sell only post, a one-post row, a not-messageable row and an own post;
  - signed out, Make offer on this post asks to sign in;
  - Show all on a strip with no "+N" tile opens its dialog, and focus returns to the menu button;
  - Make offer on this post adds only that post's matches, names the post in the line, and opens You get's picker on its list;
  - a post with no match opens the builder empty, with no status line;
  - no sideways scroll.

  Then check that `bun run --filter=web lint`, `typecheck` and `build` pass.
- [x] 4.3 Pass `{ partnerId, post }` from the thread's Make offer when the newest loaded message's card is the partner's post card carrying a match (the thread page's conversation has no `context`). Verify in a local conversation that holds such a card (local test data only, with the user's approval) that the builder is prefilled and the line names the post, and that a conversation whose newest card is an objekt card opens empty. Confirm that counter-offers and the Market drawer's Make offer behave as before. Then check that `bun run --filter=web lint`, `typecheck` and `build` pass.

## 5. Integration

- [x] 5.1 Run `bun run check` and `bun run build` from the root. Walk through Browse, For you and a conversation at 1440 and 390 px in en, ko and ja on the local dev server, reading production only. Verify that the checks and the build pass and that no screen scrolls sideways.
- [x] 5.2 Update the `AGENTS.md` of each package this change touches:
  - `packages/api/AGENTS.md`, under Offer get sources: `suggestOffer` reads the person-row pipeline (`recountPartners`), adds every match the row counts, swaps and sales alike, and returns `matched` per side.
  - `apps/web/AGENTS.md`: a request with `matches` opens through `MatchesBuilder`, whose one status region in `offer-builder.tsx` holds the loading text, the line and the failure, with `BuilderForm` portalling its line into it.

  Verify that each paragraph names those parts, that `bun run format` leaves both files unchanged, and that `bun run lint` passes.

## Workflow follow-up

- Archive after review, then confirm that `openspec/specs/web-trade-browse/spec.md` and `web-trade-for-you/spec.md` no longer say the builder opens empty.
