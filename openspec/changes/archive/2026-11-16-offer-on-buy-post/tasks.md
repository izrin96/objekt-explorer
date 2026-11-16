# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=@repo/api` or `--filter=web`). Tests cover pure modules only: `post-choice.test.ts` and `offer-recipient-rules.test.ts`, never the database or the network. Production is only read. Mutation flows are checked up to the request the builder would send, and recorded as "read-only verified".

## 1. API

- [x] 1.1 In `packages/api/src/lib/offer-recipient-rules.ts`, change `givesRuleOf`'s `wantList` branch to `return { check: { want: i.wantList }, stored: i.onPost ?? i.wantList };`. Update its doc comment to say a gives-only offer naming a Buy post stores that want list (design, Decision 7).
  - In `offer-recipient-rules.test.ts`, change "a start with no post" to expect `{ check: { want: 9 }, stored: 9 }` and rename it "a Buy post with no post stores the Buy post".
  - Keep "a start with a post stores the post", "a new ask ignores the start" and "a counter asking nothing new ignores post and start" unchanged.
  - `bun test packages/api/src/lib/offer-recipient-rules.test.ts` passes. Lint, typecheck and build pass for `@repo/api`.
- [x] 1.2 In `packages/api/src/services/offer/picker/theirs.ts`, `partnerListChoices`:
  - Select `buy`: `NOT EXISTS (SELECT 1 FROM trade_post WHERE trade_post.want_list_id = lists.id)`, the predicate `resolveWantList` (`services/offer/core.ts`) uses, written with `tradePost` from `@repo/db` the way `core.ts` writes it.
  - Return `wantLists` as `{ slug, name, buy }`.
  - Change the return type there and `wantLists?` in `CandidatesPage` (`picker/shared.ts`) to `{ slug: string; name: string; buy: boolean }[]`. Update both doc comments: `buy` is true for a Buy post, a want list that leads its own post.
  - Verify locally (dev server on the local database): the builder's theirs read (`offer.candidates`, side `theirs`, no offset) for a partner with a Buy post and a paired want list returns `buy: true` and `buy: false` for them. Lint, typecheck and build pass for `@repo/api`.

## 2. Web: pure logic

- [x] 2.1 In `apps/web/src/features/offers/builder/post-choice.ts`:
  - `type Post = { slug: string; want?: string | null; buy?: boolean }`.
  - Add `buyPostsOf(wantLists: readonly { slug: string; name: string; buy: boolean }[])`, returning the `buy` ones in order as `{ slug, name, type: "want" as const, want: null, buy: true }`.
  - `openPostOf`: a Buy post (`buy: true`) is found only from `startList`, `matchesPost` and `addedPost`. `lead` and the first get pick's list skip Buy posts. The last fallback is the first post that is not a Buy post. Update the doc comment.
  - `startWantOf(wantLists, from)`: drop the `posts` parameter, and keep a slug only when its want list is in `wantLists` with `buy: true`. Same `matchesPost` → `addedWant` → `target` order. Update the doc comment.
  - `offerOnOf`:
    - `posts` becomes the Offer on choices (`{ slug; want: string | null; buy?: boolean }`).
    - Rename `gives`' `start` to `buy`.
    - First, when `postSlug` names a Buy post: `{ gives: { want: postSlug, buy: true }, input: { wantList: postSlug } }`, whatever `newAsk` says.
    - Then, as today, new ask, then counter.
    - Then `startWant` only when `posts.length === 0`.
    - Then the post. Update the doc comment.
  - `giveRule` is unchanged.
  - In `builder/form.tsx`, only to keep it compiling: call `startWantOf(wantLists, { … })` without `posts`, and read `gives.buy` where `ruleLine` reads `gives.start`. The rest of the builder changes in 3.2.

  Lint, typecheck and build pass for `web`.
- [x] 2.2 In `post-choice.test.ts`, update the fixtures to the new signatures and `start` → `buy`, then add:
  - `buyPostsOf`: keeps only `buy` want lists, in order, typed `"want"`.
  - `openPostOf`, with posts `doubles`, `spares`, `lookingfor` (`buy: true`):
    - opens on `lookingfor` from `startList`, from `matchesPost` and from `addedPost`;
    - `lead: "lookingfor"` opens on `doubles`, which keeps "a WTB lead post is no post to ask from";
    - a fallback never lands on a Buy post, even listed first.
  - `startWantOf`: a `buy: false` want list is no start; a `buy: true` one is, from `matchesPost`, `addedWant` and `target`.
  - `offerOnOf`:
    - a Buy post under Offer on sends `{ wantList }` and gives `{ want, buy: true }`, with `newAsk` true too;
    - a `startWant` is ignored while `posts` is not empty;
    - a `startWant` with no posts sends `{ wantList }`, and with `newAsk` sends `{}` with gives `"every"`.

  `bun run test --filter=web` passes (Turbo compiles Paraglide first).

## 3. Web: the builder

- [x] 3.1 Add the message `offer_rule_buy_post` to `apps/web/messages/en.json`, `ja.json` and `ko.json`, beside `offer_rule_one_post`:
  - en: `"{post} is a Buy post, so an offer on it asks for nothing. To ask for objekts, change Offer on."`
  - ja: `"投稿「{post}」は購入の投稿のため、この投稿へのオファーでは何も求めません。オブジェクトを求めるには、オファーする投稿を変更してください。"`
  - ko: `"{post} 게시물은 구매 게시물이라 이 게시물에 대한 제안으로는 아무것도 요청하지 않습니다. 오브젝트를 요청하려면 제안할 게시물을 바꾸세요."`

  Run `bun run paraglide:compile` in `apps/web`. Lint, typecheck and build pass for `web`.
- [x] 3.2 In `apps/web/src/features/offers/builder/form.tsx`:
  - `const buyPosts = buyPostsOf(theirs.data?.wantLists ?? [])`.
  - `choices = onePost ? [...posts, ...(request.counter === undefined ? buyPosts : [])] : []`.
  - Pass `choices` to `openPostOf` and to `chosenPostOf`, not `posts`.
  - `listName` looks in `[...theirLists, ...buyPosts]`, so `postName` is the Buy post's name, never its slug.
  - `const onBuyPost = choices.some((post) => post.buy === true && post.slug === postSlug)`.
  - `offerOnOf({ postSlug, posts: choices, startWant, newAsk, counter })`.
  - `ruleLine`:
    - give side: the `buy` branch (renamed in 2.1) still looks the name up in `wantLists`.
    - get side, first: `if (onBuyPost) return m.offer_rule_buy_post({ post: postName ?? postSlug! })`.
    - Replace `if (choices.length < 2) return null` with `if (posts.length < 2) return null`, so the line about another post counts have and sale posts only.
  - `SideColumn`'s `closed` for `get`: `(rules?.asksClosed === true && source === "collection") || onBuyPost`.
  - The header's plain line: `postName`, else, while `!onePost && offerOn.input.wantList !== undefined`, that want list's name from `wantLists` (design, Decision 8). The select condition stays `choices.length > 1 && postSlug !== null && openPost !== undefined`.

  Check locally in the browser (`browser-testing-with-devtools`) on the dev server against the local database, with a local partner holding a have post paired with a want list, plus a Buy post:
  - from chat or the person page, Offer on is a select: the have post, then the Buy post with its Want badge;
  - choosing the Buy post hides You get's Add and shows the new line, and the send request (read in DevTools, not sent) carries `wantList` and no `post`;
  - a pick from the have post, then a switch to the Buy post, outlines it "Not on {Buy post}" and disables Send; switching back clears it;
  - with the partner's rule on, You give's line names the Buy post and its picker shows only that list;
  - a counter offers no Buy post.

  Record them as "read-only verified". Lint, typecheck and build pass for `web`.
- [x] 3.3 Name a post's own Make offer as its start (design, Decision 4):
  - In `apps/web/src/features/trade/post-block.tsx`, `makeOffer`: `startList: offering?.list.slug ?? anchor.list.slug`.
  - In `apps/web/src/features/trade/trade-actions.tsx`, give `TradeActions` an optional `startList?: string` prop and pass it into `MakeOfferButton`'s `start`.
  - In `apps/web/src/features/trade/person-row-view.tsx`, pass `startList` to `TradeActions` while a post is `focused`: `(focused.sides.find((side) => side.role !== "want") ?? anchor)?.list.slug`. Pass `undefined` otherwise, so a row's Make offer is unchanged.

  Check locally:
  - Make offer on a Buy post, from its menu and from its post page's own button, with and without matches, opens Offer on on it;
  - Make offer on the row whose lead post is that Buy post still opens on the first have or sale post;
  - the page does not fall back to the person (`withoutLists`).

  Lint, typecheck and build pass for `web`.

## 4. Docs

- [x] 4.1 `apps/web/docs/offers.md`, Offer builder: rewrite the Offer on and You give sentences.
  - Offer on lists the partner's lists on Trade, then their Buy posts (`buyPostsOf`, from `wantLists[].buy`), with none in a counter.
  - `openPostOf` opens on a Buy post only from `start`, `matches.post` or `added.wantSlug`. `PostBlock` and a post page's `TradeActions` pass a Buy post as `start`.
  - On a Buy post, You get is closed with `offer_rule_buy_post`, and `offerOn.input` is `{ wantList }`.
  - `startWantOf` only matters for a partner with no lists, where the header line names the Buy post while nothing is asked.
  - The one-post line counts have and sale posts.
- [x] 4.2 `packages/api/docs/offers.md`:
  - In the `post_list_id` bullet, say that a gives-only offer naming a Buy post (`wantList`) stores that want list, and `post_id` the row it leads.
  - In the `wantLists` bullet, add `buy`, computed with `resolveWantList`'s predicate.
  - Fix "`givesRuleOf`'s `stored`, which is null for a counter asking nothing new and for a gives-only offer with no `post`" to "with no `post` and no `wantList`".

## 5. Close

- [x] 5.1 None of `apps/web/AGENTS.md` and `packages/api/AGENTS.md` changes: both point to `docs/offers.md` (task 4), and no convention, trap or workflow changes. Run `bun run check` from the repo root. It passes.
