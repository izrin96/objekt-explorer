# Design

## Context

After `sale-list-open-to-swaps`, the Sell step's writes come from `composerWrites("sell")` (`schemas/trade-post.ts`), which saves a picked want list as `flagsOf("swaps")` whatever the choice says. The rest of the code reads the result:

- `tagsOf` returns early for a sale post, as WTS then WTT, and never looks at the want side.
- `postKindOf` gives a Sell post `alsoPay: false`.
- `editStart` keeps an added want list's own Open to only when the post has no sale list.
- `TAG_WHERE.wtb` (`services/trade-feed/query.ts`) checks a pair's `partner_match_sale` only when the anchor is a have list.

Matching never reads the post: `offerMatchesWantSql`, the candidates, the viewer's indexes (`pickByOpenTo`) and want alerts all read the want list's own `match_have` / `match_sale`. So a want list saved Swaps or buying already matches sale lists, whichever post holds it.

`checkLinkedList` refuses a pair only when the want side is Buying only (`pairRefusesOpenTo`). Swaps or buying is already allowed on a want list linked to a sale list.

## Goals / Non-Goals

**Goals:**
- "Also pay" on a Sell post's want list, saved as Swaps or buying.
- Tags, filters, the composer preview, My posts and the Trade line all agree on WTS, WTT and WTB.
- No new column, migration or input field.

**Non-Goals:** as in the proposal.

## Decisions

1. **The want list's Open to is the only state.** "Also pay" on Sell writes `flagsOf("both")` to the want list. Nothing new is stored on the sale list or the post, so matching, Can swap and alerts need no change.
   - Rejected: a new `lists` flag for "this pair also buys". It would duplicate what `match_sale` already says.

2. **`composerWrites("sell")`.** With a want list picked: `wantFlags = flagsOf(choice.alsoPay ? "both" : "swaps")`, the same expression Swap uses. Without a want list, `alsoPay` is ignored, as on Swap.

3. **Tags and kind:**
   - `tagsOf` on a sale post: WTS; then WTT when it takes swaps; then WTB when its want side is open to buying.
   - `postKindOf` on a Sell post: `alsoPay` is the want side being open to buying.
   - `editStart` drops its `!post.sale` guard, so a want list added to a Sell post keeps its own Open to.
   - `TAG_WHERE.wtb` treats a pair anchored on a sale list as it treats one anchored on a have list: `posts.type IN ('have', 'sale') AND posts.partner_id IS NOT NULL AND (partner open to buying)`. That keeps `tagsOf` and its SQL twin in step.

4. **Input.** `trade.savePost` already takes `alsoPay` (default false).
   - An open tab built before this change sends `alsoPay: false` on Sell. Its edit would save a Sell pair's want list as Swaps only, which matches how that tab shows the post.
   - Neither change is deployed yet, so no live Sell pair exists before both ship together.

5. **Web.** The Sell step reuses the Swap step's `OptionCheck` and strings (`trade_composer_also_pay`, `_hint`, `_needs_want`). It sits under the want section, disabled with no want list.
   - The request sends `alsoPay` on Sell when a want list is picked and "Also open to swaps" is ticked.
   - Unticking "Also open to swaps", or clearing the want slot, resets `alsoPay`. The existing reset on a cleared want slot covers the second case.
   - The preview adds `trade_composer_match_also_pay`.
   - My posts shows "Would also pay" for a Sell post with `alsoPay`, after the Market note.
   - The Trade line reads `alsoPay` from `tradeLineOf` already.

6. **Help.** The WTB row's "Their post" cell becomes "Buy, or a Swap or Sell post that also pays", in en/ko/ja.

7. **Caches.** Tags are computed from the lists at read time and the cached rankings don't store them, so no cache key changes. Task 2.2 confirms this before skipping the bump.

## Risks / Trade-offs

- **Busy row.** Three chips on one row. They are short and wrap, and they say what the trader posts in Discord.
- **Wider reach.** A Sell post with WTB reaches sellers too, through the want list's existing rule. That is intended: the seller asked for it.
