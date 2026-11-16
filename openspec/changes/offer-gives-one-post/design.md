# Design

## Context

`offer-one-post-only` (shipped in `61832939`, not archived) made every offer to a partner with have or sale lists ask from one post. Its Decision 3 kept gives-only offers (no ask, or only kept objekts) on no post and checked them against every want list (`wantedAmong`), because a seller starting from a Buy post sends `post` = the partner's first have list, and that list's want list would refuse what the Buy post wants (14 production users have a Buy post beside a have or sale post and the setting on).

The owner's complaint: You give's picker showed objekts that only another post wants. The first fix in the working tree (`givesPostOf` and `storedPostOf` removed; `form.tsx` reads `giveRule(rules, post under Offer on)`; `createOffer` checks and stores `onPost`) broke four cases: a Buy-post start (Offer on cannot name a want list, so it falls to `posts[0]`), a row whose You give matches win (`giveWins` fills You give from every want list), a counter asking only for kept objekts (Offer on is arbitrary), and a gives-only offer on a post without a want list (took anything).

Code that shapes the design:

- **Start signals.** `requestOf` (`features/offers/offer-link.ts`) turns the page search into `OfferRequest`. A Buy post's Make offer (`post-block.tsx`) sends `to = {list: <want slug>}` and, with matches, `matches.post = <want slug>`; a chat post card (`postOfferOf`) sends `matches.post` only. A Trade row sends `to` = its lead list, with `matches` only when it has some.
- **Suggestions.** `suggestOffer` (`services/offer/picker/index.ts`) returns `postSlug`/`postName` (the builder gets them as `added`). With `post`, `postListsOf` cuts both sides to one post; for a Buy post, `postSlug` is the want list's slug. For a row without a Can swap pair, You get is cut to one post (`onePostOf`, `rowPost`), but You give is never cut: `giveAll` and `fillMatches`'s give side both span every want list.
- **Picker.** `MineGrid`'s `wantList` reaches `giveNarrowing`, which already accepts any of the partner's discoverable want lists. `partnerListChoices` returns only have and sale lists, each with `want` (the paired want list's slug, null when missing or empty).
- **Server checks.** `postWantedAmong(postListId)` finds the want list through `postPartnerSql`, which for a Buy post's own want list returns null, so it cannot check a Buy post. `wantedOn` returns null for "no entries", which callers have read as "take anything".
- **Storage.** `offer.post_list_id` is joined to `lists` by `fetchOffers` for "Offer on {post}"; `post_id` is the lowest `trade_post` that list leads; `apps/worker/src/script/trade-post-drift.ts` checks the two agree.

## Goals / Non-Goals

**Goals:** You give is held to exactly one want list wherever the offer has one, and the server checks the list the builder shows. A post without a want list takes no objekts. Open tabs keep validating.

**Non-Goals:** flagging gives already on the side before Send (the server's `not_wanted` refusal outlines them); cutting near matches to one want list; Buy posts as Offer on choices; offer rules per post.

## Decisions

### 1. The give rule

One table, implemented twice as pure functions: `offerOnOf` in `apps/web/src/features/offers/builder/post-choice.ts` and `givesRuleOf` in `packages/api/src/lib/offer-recipient-rules.ts`. "New ask" = a get item that is not a kept objekt (`!pick.kept` on the web; `!keptObjekt(row.item)` on the server, never `row.kept`, which is false for a kept objekt `matchEntry` found on a list). "Start" = a discoverable, non-empty want list of the partner's that no have or sale post of theirs pairs with.

| # | New ask | Counter | Start | Post (Offer on / `post`) | Gives held to | Stored `post_list_id` | Client sends |
| - | - | - | - | - | - | - | - |
| 1 | yes | any | any | none (partner has no lists) | every want list | null | nothing |
| 2 | yes | any | any | with want list | that want list | post | `post` |
| 3 | yes | any | any | without want list | no objekts | post | `post` |
| 4 | no | yes | any | any | every want list | null | nothing |
| 5 | no | no | yes | any | the start want list | null (client omits `post`) | `wantList` |
| 6 | no | no | no | with want list | that want list | post | `post` |
| 7 | no | no | no | without want list | no objekts | post | `post` |
| 8 | no | no | no | none | every want list | null | nothing |

"Every want list" with none on Trade takes anything (unchanged). "No objekts" refuses every give except a countered ask (`counteredAsks`); a top-up still goes. Only rows 1, 4 and 8 read every want list, as the owner ruled.

The server reads `post` and `wantList` but never trusts them alone: `post` through `resolvePostList` (a have or sale list on Trade), `wantList` through a new `resolveWantList` (the partner's discoverable want list with entries). A request with both, which no builder sends, takes row 5's check and stores `post`.

*Alternative:* derive the start on the server. Rejected: only the builder knows where it started.

### 2. The new input `wantList`

`createOfferInputSchema` gains `wantList: z.string().min(1).max(12).optional()`, named as the picker's narrowing field. The builder sends it only in row 5.

/rpc: a tab from before this deploy never sends it. A tab from before `offer-one-post-only` sends no `post` for gives-only offers: row 8, as today. A tab loaded after `offer-one-post-only` sends `post` for a gives-only offer and its builder showed every want list: it now lands in row 6 or 7. A Buy-post seller on such a tab is refused `not_wanted` with the picks outlined, and a reload fixes it. *Alternative:* treat a gives-only `post` without `wantList` as legacy (every want list). Rejected: the owner ruled that every want list applies only to rows 1, 4 and 8, and the exception would stay open to any client forever.

### 3. Storage

`post_list_id` stays a have or sale list. Row 5 stores null: a want list there would make every reader show a want list as "Offer on". The card for a Buy-post gives-only offer shows no "Offer on", like a counter asking nothing new (row 4). The `schema.ts` comment on `postListId` lists the null cases. *Alternative:* store the Buy post's want list, so the card reads "Offer on looking for" (`post_id` would resolve, since a Buy post's `lead_list_id` is its want list). Rejected: it changes what the column means.

### 4. Where the builder finds the start

`startWantOf(posts, wantLists, { matchesPost, addedWant, target })` returns the first of `request.matches?.post`, `added?.wantSlug` and `to.target.slug` (list kind) that is in `wantLists` and no post's `want`. `wantLists` is a new optional field on the whole theirs page (`CandidatesPage.wantLists: { slug, name }[]`): the partner's discoverable want lists with entries. It comes from the same statement as `partnerListChoices` (widened `WHERE`, rows split by type), so it adds no round trip. It also supplies the name for the rule line.

A row with no matches whose lead is a Buy post also sends `to` = the want list, so it counts as a start. That is the same post the row stands for. *Alternative:* require `matches`. Rejected: a Buy post's Make offer without matches sends no `matches` either.

`openPostOf` maps a slug equal to a post's `want` to that post, so a start or a give-matches want list that pairs with a post opens Offer on there and follows rows 2, 3, 6 and 7.

### 5. Builder UI

Offer on is unchanged: it still chooses where You get's asks come from, and its select or line shows in every row. The switch, line and `MineGrid` follow `offerOnOf`:

- `{ want, start }`: `wantList` = that slug; line `offer_rule_wanted_post` with the start's name from `wantLists`, else `postName`.
- `"every"`: `offer_rule_wanted_only`, no `wantList` (`giveRule` returns `"all"`, or null with no want list on Trade).
- `"none"` (rows 3 and 7): new message `offer_rule_wanted_none`; You give's `SideColumn` gets `closed` (its existing prop that hides Add); the picker cannot open on You give.

The first new ask takes the rule to the Offer on post (rows 2 and 3). Removing the last one brings the start back. Changing Offer on with no new ask leaves a start in place. *Alternative:* hide Offer on in rows 4 and 5. Rejected: You get's Add would then have no post to open on.

### 6. Give matches from one want list

In `suggestOffer`, when `post` is undefined and there is no `swapPair`, both sides are cut from their uncut matches (`fillMatches` has already emptied the smaller one): You get to one askable post, You give to one discoverable want list, each by the pure `oneListOf` (most matches over `partnerListIds`, a tie to the row's `lead`, then list order, through `rowPost`). The partner's lists are read once in `suggestOffer`'s first `Promise.all`, so the cut adds no round trip. The direction is chosen after both cuts (You get on a tie). This covers both paths that filled You give from every want list: `giveWins`, and `fillMatches` choosing the give side. When You give wins, the result carries `postName` = the want list's name, `postSlug` = null and a new `wantSlug`. The builder passes `wantSlug` to `openPostOf` (a paired list opens its post) and to `startWantOf` (an unpaired one is the start).

### 7. Copy

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `offer_rule_wanted_none` (new) | {post} has no want list, so {name} takes no objekts on it. You can offer a top-up. | {post} 게시물에는 원하는 목록이 없어 {name}님은 이 게시물로 오브젝트를 받지 않습니다. 추가 금액은 제안할 수 있습니다. | 投稿「{post}」には希望リストがないため、{name}さんはこの投稿でオブジェクトを受け取りません。上乗せはオファーできます。 |

`auth_account_only_wanted_desc` is rewritten in all three locales (strings in tasks.md 5.2). The changelog stays English.

## Risks / Trade-offs

- [Tabs loaded between `offer-one-post-only` and this deploy send `post` for gives-only offers] → held to that post's want list (Decision 2). Buy-post sellers are refused once, with outlines, until a reload.
- [Recipients with the setting on and posts without a want list now get only top-ups there] → the owner's ruling. The account description and the builder line say so. Open offers stay.
- [Before the first ask, You get's Add opens on `openPost` while You give follows a Buy-post start] → Offer on reads that post, so the builder says where asks come from.
- [Gives picked under one rule stay when the rule changes] → refused `not_wanted` on Send and outlined (non-goal).
- [Near give matches still span every want list] → offered as lines, refused on Send if off the rule.
- [Archive order] → this change's deltas replace `offer-one-post-only`'s versions of the same requirements, so archive `offer-one-post-only` first.

## Migration Plan

No schema change; only the comment on `postListId` changes. Deploy web, which carries the client and the api. Rollback is a revert. Offers stored while it ran keep their `post_list_id`, which every reader handles.

## Open Questions

- A Buy-post start to a partner with no have or sale list: this design applies row 5 (decision 1 is about the start), not every want list. The owner should confirm.
