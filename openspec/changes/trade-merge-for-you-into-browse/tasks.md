Start only after `trade-person-level-matches` (change 1) is committed and archived. Then re-run `openspec validate trade-merge-for-you-into-browse --strict`: this change's MODIFIED blocks must keep every scenario name change 1 adds to the main specs. The working tree also holds a separate, uncommitted `post-list-dialog.tsx` redesign. Leave that file alone, merge into the current contents of `apps/web/messages/{en,ja,ko}.json`, and commit only this change's hunks.

## 1. Pure helpers (api)

- [x] 1.1 In `packages/api/src/lib/trade-feed.ts`, add `browseMode({ match, matches })` and `narrowViewer(viewer, sides)` (design decisions 1 and 2), moving `narrow()` there from `services/trade-feed/viewer.ts`. Add cases to `trade-feed.test.ts`:
  - `browseMode`: absent gives off, `matches: true` gives any, and `match` wins over `matches`;
  - `narrowViewer`: a pair keeps both directions, a lone have list empties `want`, and a sale list keeps only its own `have` entries.

  Verify `bun test packages/api/src/lib/trade-feed.test.ts` passes, and that lint, typecheck and build pass for `@repo/api`.
- [x] 1.2 In `lib/trade-rank.ts`, add `mutualOrder(partners)` and `peopleAfter(ordered, rank)` (design decisions 3 and 4). Add cases to `trade-rank.test.ts`:
  - the order is mutual, then sum, then `updatedAt`, then `userId`, with no idle tier;
  - `peopleAfter` starts at the cursor's person and keeps everyone after its tuple;
  - a person whose tuple moved up is not returned again.

  Verify `bun test packages/api/src/lib/trade-rank.test.ts` passes, and that lint, typecheck and build pass for `@repo/api`.

## 2. API

- [x] 2.1 In `schemas/trade.ts`, extend `browseInputSchema` with optional `match`, `list` and `cursor.rank`. Add `personInputSchema` (`{ userId, list? }`) and `mutualCountInputSchema` (`{ list? }`). Leave every existing input unchanged. Add `schemas/trade.test.ts`, which parses the old `browse` shapes from design decision 14's table: `matches: true`, no `matches`, and a `{ bumpedAt, id }` cursor. It also parses the old `forYou`, `tabCounts` and `listMatchCount` inputs. Verify `bun test packages/api/src/schemas/trade.test.ts` passes, and that lint, typecheck and build pass for `@repo/api`.
- [x] 2.2 In `services/trade-feed/`:
  - factor the stage-1 predicates into a `feedWhere` shared by `fetchFeedRows` and a new owner mode;
  - resolve `browseMode` and the Compare with sides in `browseFeed`, narrow the viewer, and pass the sides to `personMatches`;
  - add the Mutual path from `getMutualPeople` through `getMutualPeople` and `peopleAfter`, with its `nextCursor.rank` (design decisions 2 to 4).

  Verify lint, typecheck and build pass for `@repo/api`. Then, read-only with the smoke-test account:
  - `trade.browse` with `matches: true` lists the same posts as before;
  - `match: "mutual"` lists only owners whose `person.counts` give `mutualOf > 0`, grouped and in rank order;
  - paging under Mutual repeats no post id;
  - `list` narrows the chips.
- [x] 2.3 In `services/trade-matches/index.ts`, split `hydratePartners` out of `computeTradeMatches`. Add `personDetail` and the `trade.person` procedure, and `mutualCount` with the `trade.mutualCount` procedure, both cached for 60 s (design decisions 5 and 6). Give `tabCounts` an optional `forYou` input (default `true`, old count); the current web sends `false`. Verify lint, typecheck and build pass for `@repo/api`. Then, read-only for the smoke-test account:
  - `trade.forYou` answers as before;
  - `trade.person` returns that person's partner with `counts` equal to their post's `person.counts`;
  - `trade.mutualCount` equals the number of distinct owners Mutual lists;
  - `trade.tabCounts` still validates its output.

## 3. Web: routes and search

- [x] 3.1 In `apps/web/src/features/trade/browse-search.ts`:
  - add `match`, `list` and `person` to `browseSearchSchema`;
  - add `canMatchOf`, `matchModeOf` and `forYouToBrowse`, and move `forYouSearchSchema` here from `search-schema.ts`, deleting that file;
  - give `toBrowseInput` the `canMatch` argument (design decision 7).

  Add cases to `browse-search.test.ts`:
  - the default is Any;
  - a `slug` link defaults to Off;
  - `matches=1` gives Any;
  - no `canMatch` gives Off;
  - `list` is dropped under Off;
  - the redirect mapping for `mutual`, `they_have`, `they_want`, `list` and `partner`.

  Verify `bun test apps/web/src/features/trade/browse-search.test.ts` passes, and that lint, typecheck and build pass for `web`.
- [x] 3.2 Reorder the `/trade` loader so it awaits `currentUser` before building the browse options. Turn `/trade/for-you` into the redirect route (design decision 8), removing `requireSignedIn`. Verify lint, typecheck and build pass for `web`, and that `/trade/for-you?match=they_want&list=spares&partner=x` lands on `/trade?match=any&list=spares&person=x` both signed in and signed out.

## 4. Web: Browse

- [x] 4.1 Move the compare logic into `compare-with.ts`, keeping only the both-ways kind (design decision 8). Add `matching-controls.tsx` with:
  - the Matches tabs and "Mutual N" from `trade.mutualCount`;
  - Compare with, the compared-lists line and the help;
  - the phone Matching sheet;
  - change 1's prompts.

  Wire it into `browse-view.tsx` in place of the Only matches slot, add the Mutual empty state, and dedupe flattened posts by `id` (design decisions 4 and 9). Add the messages from design decision 13 in en, ja and ko. Verify lint, typecheck and build pass for `web`.
- [x] 4.2 Add `person-sheet.tsx` and `personOptions` in `queries.ts`, opened through `person` (design decision 10). Leave `person` out of the `/trade` route's `loaderDeps`, and open and close the sheet with `resetScroll: false` (design decision 7). In `browse-post.tsx`, replace See in For you with All matches, add the Hide menu item, and drop `forYouMutual` and the `forYouOptions("mutual")` read in `browse-view.tsx`. Move `useHidePartner`'s optimistic update onto the browse pages, and make the footer note open `HiddenPartnersDialog` (design decision 11). Verify lint, typecheck and build pass for `web`.
- [x] 4.3 Remove `for-you-view.tsx`, `for-you-results.tsx`, `partner-row.tsx` and the For you tab. Point `notification-items.tsx`, `list-header.tsx` and `user-menu.tsx` at Browse (design decision 12). The header's Find matches count reads `trade.mutualCount({ list })` for a list that compares both ways and shows no count for a lone list; drop `listMatchCountOptions` from the web. Remove the messages listed in design decision 13 that nothing uses, and reword the others that still say "For you" in en, ja and ko (decision 13); `grep -in "for you" apps/web/messages/en.json` finds no user-facing mention. Verify that lint, typecheck and build pass for `web`, and that `grep -rn "/trade/for-you" apps/web/src` finds only the redirect route.

## 5. Verify

- [x] 5.1 Run `bun run check`, `bun run build --filter=web` and `bun run knip`, with no new unused exports, files or messages. All pass.
- [ ] 5.2 Browser check of `/trade` at 1280 px and 390 px, light and dark, signed in with the smoke-test account and signed out. It is read-only: open the menus, the sheets and the dialogs, and never activate Hide, Unhide, Message or Make offer. Record each of these:
  - the default reads Any;
  - Off, Any and Mutual each list what the spec says, and Mutual groups people in rank order;
  - Mutual N matches the people listed;
  - Compare with with a pair, and a lone list disabled under Mutual;
  - the compared-lists line;
  - the phone Matching sheet;
  - All matches opens the sheet with the same chip, and Back closes it;
  - the sheet's struck objekts and Ownership checked time;
  - Hide in the post menu (left unclicked);
  - the footer note opening Hidden people;
  - `/trade?matches=1`, `/trade?slug=…` and `/trade/for-you?…` redirects;
  - notification, Find matches and account-menu links;
  - the tabs reading Browse | My trades;
  - no sideways scroll at 390 px.

## 6. AGENTS.md

- [x] 6.1 Update the "Trade matching" section of `packages/api/AGENTS.md`:
  - Browse's Mutual reads every Mutual person through `getMutualPeople`, and pages by the person keyset (`peopleAfter`), never by offset;
  - Compare with narrows through `narrowViewer`, so chips, rings and filters share it;
  - `trade.forYou` and `listMatchCount` stay only for open tabs and the list header.

  State that `apps/web/AGENTS.md` and the root `AGENTS.md` are unchanged, unless the person sheet's Back handling became a convention worth recording. Verify lint and typecheck pass for `@repo/api`.

## 7. Mutual counts buying; swaps vocabulary

- [x] 7.1 Artifacts: fold both decisions into `proposal.md`, `design.md` (decision 15) and the delta specs, with MODIFIED blocks for Posts from lists on Trade (`web-trade-browse`) and Want list match option (`web-lists`).
- [x] 7.2 Mutual is `Math.min(theyHave, youHave)`: update `mutualOf` and `countsFit`, the Mutual prefilter and ordering in `candidates.ts`, and bump the four cache keys (design decision 15). Keep `tradeTheyHave` and `tradeYouHave` in the output type. Update `trade-person.test.ts`, `trade-rank.test.ts` and `schemas/trade.test.ts`: a sale list against a buying want list counts toward Mutual, and against a swaps-only want list it does not.
- [x] 7.3 Reword the user-facing "trade only" strings to swaps in en, ja and ko, and `trade_match_help_mutual`, per design decision 15.
- [x] 7.4 Update the "Trade matching" section of `packages/api/AGENTS.md`.
- [x] 7.5 Verify typecheck, lint, test, `bun run build --filter=web`, `oxfmt --check` and `openspec validate trade-merge-for-you-into-browse --strict`.
