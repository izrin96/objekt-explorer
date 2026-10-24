# Tasks

## 1. Post rules (pure)

- [x] 1.1 Add the pure post module in `packages/api/src/schemas/` (`postKindOf`, `tagsOf`, `composerWrites`) beside `open-to.ts`, with `*.test.ts` covering every row of the design's mapping (Swap with and without also pay, Swap with one list, Buy, Sell, a pre-rule Buying only pair); `bun test` passes, and lint + typecheck pass for `@repo/api`
- [x] 1.2 Replace `postTag` with `postTags` in `lib/trade-feed.ts` on top of `tagsOf`, keep `tag` as the first tag, drop `buyingOnly`, and update `trade-feed.test.ts`; `bun test` passes, lint + typecheck pass for `@repo/api`

## 2. API

- [x] 2.1 Expose the partner's `match_sale` and `match_have` in `postsCte` and rewrite `TAG_WHERE` to the design's rule; bump `trade:mutual-people`, `trade:mutual-count`, `trade:people-order` and `trade:feed-scope` key versions; check read-only against the dev database that a want list on its own open to swaps or buying is listed under both WTT and WTB; lint + typecheck pass for `@repo/api`
- [x] 2.2 Add `tags` beside `tag` on feed posts and `trade.myPosts` (chat post cards keep `tag` only), and add `kind`, list roles and the option to `trade.myPosts`; confirm an open tab's reads still parse (`tag` unchanged in shape); lint + typecheck pass for `@repo/api`
- [x] 2.3 Add `TRADE_POST_REFUSALS` and `trade.savePost` / `trade.takeDownPost` per the design, one transaction each, ending in `touchList`; verify each refusal by a request-boundary call (read-only verified, no writes on the shared database); lint + typecheck pass for `@repo/api`
- [x] 2.4 Make `linkedListId` and `discoverable` optional in `editListInputSchema`, keeping the current value when omitted; state in the PR what an open tab sends after the deploy and confirm it validates; lint + typecheck pass for `@repo/api`

## 3. Web: composer and Your posts

- [x] 3.1 Turn `post-list-dialog.tsx` into the composer (kind step, list step, also pay, tags and match preview, disabled rows with reasons, unpair prompt, opened on an existing post for Edit post), matching the mockup; check it in the running app up to the `trade.savePost` request (read-only verified); lint + typecheck + build pass for `web`
- [x] 3.2 Rework `my-posts.tsx` to one row per post with tags, kind, lists by role, option, listed or idle, and the Edit post / Take off Trade menu; move New post into its header and render the no-posts row; keep the top button as New post only on For you and for signed-out visitors; check at 1280 px and 390 px; lint + typecheck + build pass for `web`
- [x] 3.3 Render `tags` on the trade card's chip and remove the Buying only and Swaps only notes; rewrite the Browse help's tag table and Mutual section per Tag help; lint + typecheck + build pass for `web`

## 4. Web: list form and For you

- [x] 4.1 In `list-form.tsx`, replace Show on Trade, Open to and the link picker on have and want lists with the Trade line (In your … post / Paired · Off Trade / Not on Trade, Edit post / Post it), relabel the sale list switch Show on Market and Trade, and offer Post it after creating a have or want list; check the edit dialog of each list kind in the running app; lint + typecheck + build pass for `web`
- [x] 4.2 In `matching-controls.tsx`, replace both `MutualSwitch` copies with one `aria-pressed` button between Compare with and the help; check tab order and wrapping at 1280 px and 390 px; lint + typecheck + build pass for `web`
- [x] 4.3 Add every new or changed string to `en`, `ko` and `ja` (composer, Trade line, Your posts rows, refusals, Show on Market and Trade) and remove the unused ones; lint + typecheck (which compiles Paraglide) + build pass for `web`

## 5. Integration and docs

- [x] 5.1 Walk the flows in the running app: post Swap with both lists and also pay, Buy with a paired want list (unpair prompt), Sell, Edit post dropping the have list, Take off Trade then Post it; record each as read-only verified up to the request, and check Browse filters WTT/WTB and Mutual N read-only; `bun run check` passes
- [x] 5.2 Update `packages/api/AGENTS.md` (Trade matching: tags as a set, `savePost`/`takeDownPost`, the post module as the one source of post kinds, the bumped cache keys) and `apps/web/AGENTS.md` if its trade notes name the switch or the dialog, or state that it needs no change; lint + typecheck + build pass for the touched packages

## Workflow follow-up

- Archive `want-buying-only-unpaired` first: both changes MODIFY "Want list match option" (`web-lists`) and "Posts from lists on Trade" (`web-trade-browse`), and this change's blocks already carry its pair rule. Re-check both blocks against the main spec after that archive.

- Before deploy, run `want-buying-only-unpaired` task 3.2 (read-only count of linked Buying only want lists on production).
- Archive the change after review.
