# Tasks

## 1. Pure rules

- [x] 1.1 `schemas/trade-post.ts`:
  - `composerWrites("sell")` saves the want list `flagsOf(alsoPay ? "both" : "swaps")`;
  - `tagsOf` adds WTB to a sale post whose want side is open to buying, after WTS and WTT;
  - `postKindOf` gives a Sell post `alsoPay` from its want side;
  - `editStart` keeps an added want list's Open to on a Sell post too.
- [x] 1.2 Tests in `schemas/trade-post.test.ts`, covering:
  - a Sell pair with `alsoPay` saves Swaps or buying and is tagged WTS, WTT, WTB;
  - without `alsoPay` it stays WTS, WTT;
  - `alsoPay` with no want list writes nothing to a want list;
  - `postKindOf` and `editStart` read it back.

  Lint, typecheck, test and build pass for `@repo/api`.

## 2. Feed

- [x] 2.1 `TAG_WHERE.wtb` (`services/trade-feed/query.ts`) also matches a pair anchored on a sale list whose partner is open to buying. Check on the local database that the WTB filter lists such a post and still skips a Sell pair saved Swaps only.
- [x] 2.2 Confirm that no cached value (For you, people order, post cache) stores tags or the want side's Open to; if one does, bump its key. Lint, typecheck and build pass for `@repo/api`.

## 3. Web

- [x] 3.1 Composer Sell step (`features/trade/post-list-dialog.tsx`):
  - "I'd also pay for what I'm looking for" sits under the want section, disabled with no want list;
  - the request sends `alsoPay` on Sell;
  - unticking "Also open to swaps" clears it;
  - the preview shows WTS, WTT, WTB and the also-pay line.
- [x] 3.2 My posts gives a Sell post with `alsoPay` the "Would also pay" detail beside the Market note. The help WTB row (`trade_browse_help_wtb_list`) names a Sell post that also pays, in en/ko/ja. Lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Local database:
  - post Sell with "Also open to swaps", a want list and "also pay"; the want list saves Swaps or buying and the post shows WTS, WTT, WTB in Browse and My posts;
  - edit it, untick "also pay", and it saves Swaps only;
  - restore the test lists afterwards.
- [x] 4.2 Browser at phone width in en/ko/ja: the Sell step with the new option, three tags on a Browse row and in the preview, the help row; no horizontal overflow.
- [x] 4.3 Update `packages/api/AGENTS.md` "Trade posts": `tagsOf` and `TAG_WHERE.wtb` on a sale pair open to buying. State that `apps/web`, `apps/worker` and `packages/db` conventions are unchanged.

## Workflow follow-up

- Archive after `sale-list-open-to-swaps`, whose requirement text these deltas modify.
