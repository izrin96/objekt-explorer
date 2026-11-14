## Context

See proposal.md for why. Current state that shapes the approach:

- **Read path.** `fetchOffers(ids, reader)` (`packages/api/src/services/offer/view.ts`) reads offers, items and the recipient-only checks in one statement. `forReader` is `o.to_user_id = reader`, `false` with no reader (`moderation/report.ts` passes `null`). `rule_suggestable` gates the wanted nudge; `toOfferView` sets `suggestWantedOnly` only for the recipient. The thread (`services/chat/messages.ts`) and `offer.views` (`services/offer/index.ts`) build views through `toOfferView`; `trade-view.ts` and `trade-history.ts` call `fetchOffers` but use only `topupView` and `itemViews`.
- **Sides are relative.** `offerSummary` flips sides for the viewer, so the stored `get` items (what the sender asks for) show under the recipient's **You give**, and "Not on your wants" (on stored `give` items) shows under the recipient's **You get**.
- **What is stored.** `offer.post_list_id` is the one post every ask came through; it is null for an offer that asks nothing, asks only kept objekts, asks across posts, asks a recipient with no lists, or whose post was deleted (`ON DELETE SET NULL`). Each `get` item's `list_id` is the list `matchEntry` matched (the sender's picked list when given), rewritten to the chosen post when one post fits (`createOffer`, `services/offer/index.ts` ~184-242). A kept objekt (one the recipient offered in the countered offer) keeps the list `matchEntry` found for it even on a one-post offer, since the rewrite loop skips it; an unlisted kept objekt and a collection ask keep `list_id` null.
- **The first-preferred edge.** `onePostVerdict` (`lib/offer-recipient-rules.ts`) takes the first ask's picked list before a list that fits every ask. With the switch on, an offer whose first ask was picked from "doubles" (also on "spares") and whose second ask is only on "spares" fails the one-post verdict and is stored across posts, though "spares" held both. With the asks in the other order it is stored on "spares". The send rule is out of scope and stays.
- **Client.** `OfferBody` (`apps/web/src/features/offers/offer-body.tsx`) renders the card, the only place a received offer shows (`chat/thread/thread.tsx` → `OfferCard` → `OfferBody`). Its decline promise calls `nudgeWantedRule` when `offer.suggestWantedOnly`. `nudgeWantedRule` (`wanted-rule.ts`) checks its id in `useNoticesStore`, dismisses it as soon as the toast shows, and calls `addActionToast` (one action, 12 s). `user.setOfferRules` already takes `multiPostAsks`.
- `offerViewSchema` (`schemas/offer.ts`) is a type source only: no procedure uses it as `.output()`, so new fields are not stripped, but they still belong in it.

## Goals / Non-Goals

**Goals:** the mark and the notice gate are computed on the server from stored data, recipient-only, inside the statement `fetchOffers` already runs; the client keeps reading only the offer; the precedence between the two decline notices is one pure, tested function.

**Non-Goals:** a new column or migration; changing what `createOffer` stores; the trade page.

## Decisions

### 1. What "asks from more than one post" means on read

An offer is marked for its recipient when `post_list_id` is null and its `get` items, leaving out kept objekts, carry two or more distinct non-null `list_id` values that still exist. The posts are the lists as stored, named by their current name, whatever their Trade state now.

- **Kept objekts are left out by the parent test**, the mirror of the give-side `asked` check: a `get` item is kept when `o.parent_id`'s offer was sent by `o.to_user_id` and has a `give` item with the same `objekt_id`. This matches what `createOffer` treats as kept (`counteredGives` reads the open offer sent to the sender in the conversation, which is the one countered, and keys it by objekt id). Without it, a counter across "doubles" and "spares" that keeps an objekt on "extras" reads "3 posts", and a counter whose open asks the `anyAsksFit` branch stored as no post could read "2 posts" through the kept objekt alone.
- **`post_list_id IS NULL` gates the read.** Every non-kept ask of an offer on a post shares that post's `list_id`, so the gate changes no answer; it skips the subquery for most offers and makes "an offer on a post is never marked" hold by construction.
- **Lists as stored, not only lists on Trade now.** The mark describes the offer as it was sent, as "Offer on {post}" does (that line also reads the list without a Trade filter). A list taken off Trade later is still the recipient's own, so naming it to them leaks nothing. A deleted list goes null and drops out, matching "a post deleted later drops it"; an offer left with one post loses the mark.
- **The first-preferred edge is worded, not fixed.** The spec says the asks "came through" the posts, meaning the lists they were stored against when sent, not "no one post could hold them". From the recipient's side this is honest: the sender asked from those posts as picked.
- **Any-copy asks** count through the list stored for them, like any other ask.

*Alternative:* count distinct `list_id` over all `get` items with no kept test (the lean in the brief). Rejected for the counter cases above. *Alternative:* a stored `spans_posts` column set by `createOffer`. Rejected: a migration and a backfill for a value the stored rows already give, and it would not drop a deleted post.

### 2. Shape of the view fields

`fetchOffers` adds two recipient-only columns, both `false`/null unless `forReader`:

- `ask_posts`: when `forReader AND o.post_list_id IS NULL`, a `jsonb_agg` of `{slug, name}` per distinct list over the non-kept `get` items joined to `lists`, ordered by each list's first item id (`GROUP BY l.id, l.slug, l.name`, `min(i.id)`); otherwise null. `json_agg(DISTINCT …)` does not work on `json`, hence the grouped subquery.
- `rule_one_post_suggestable`: under the same gate (`forReader AND o.post_list_id IS NULL`), `ru.multi_post_asks AND` the recipient has two or more have or sale lists on Trade (the `askableOnTrade` set: `boundOfferListSql("tl") AND tl.discoverable`, counted with `LIMIT 2`).

Both sit inside one `CASE WHEN forReader AND o.post_list_id IS NULL THEN … END`, not behind `AND`: Postgres does not promise to skip the right side of an `AND`, and `trade-view.ts` and `trade-history.ts` call `fetchOffers` with a reader and never read these columns.

`toOfferView`, for the recipient only, adds `askPosts` when two or more posts came back, and `suggestOnePost`, beside `suggestWantedOnly`. The rule for both is a pure function in `packages/api/src/lib/offer-recipient-rules.ts`, beside `notWanted`, so `bun test` covers it: `askPostsMark({ viewerIsRecipient, posts, suggestable })` returns `{ askPosts, suggestOnePost }`, with `askPosts` undefined under two posts and `suggestOnePost` true only with two or more posts and the gate on. `offerViewSchema` gains `askPosts: z.object({ slug, name }).array().optional()` and `suggestOnePost: z.boolean().optional()`. Both are additive; a tab from before the deploy ignores them.

The "two or more lists on Trade" condition mirrors the wanted nudge's "has a want list on Trade": with one post left, the switch refuses nothing.

*Alternative:* derive the mark on the client from each item's `listSlug`. Rejected: the client has no list names and no kept flag, and the sender would get the same inputs. *Alternative:* a boolean `spansPosts` plus a count. Rejected: the names cost one join already made, and they tell the recipient which posts were mixed, which is the complaint.

### 3. Both notices on one decline

One toast per decline. The wanted nudge wins when its id is not yet dismissed in this browser; otherwise the one-post notice shows. The notice not shown is not dismissed, so a later decline can show it. Each keeps its own id: `offer-rule-only-wanted-nudge` (existing) and `offer-rule-one-post-nudge` (new).

The choice runs before either nudge function, since `nudgeWantedRule` dismisses its own id when it shows. It lives in a new pure module `apps/web/src/features/offers/decline-nudge.ts`: `declineNudge(offer: { suggestWantedOnly?: boolean; suggestOnePost?: boolean }, dismissed: readonly string[]): "wanted" | "one-post" | null`, with the two id constants moved there (`wanted-rule.ts` imports `WANTED_RULE_NUDGE` from it). It imports nothing from `client` or a store, so `bun test` covers it. `OfferBody`'s decline `.then` reads `useNoticesStore.getState().dismissed` (a read in a callback, no subscription) and calls the chosen nudge.

Why the wanted nudge first: it keeps shipped behaviour, since an offer that showed the wanted nudge before still shows it. The requirement "Nudge after declining an unwanted offer" still needs a MODIFIED block, because four of its scenarios end in "no notice shows", which is untrue once the same decline can show the notice about posts; they now read "no notice to turn on Only offers with what I want shows". The new requirement's scenarios say "no notice about posts" for the same reason.

*Alternative:* two toasts. Rejected: two 12-second action toasts at once compete for one decision. *Alternative:* the one-post notice first, since it is the new one and the complaint behind it. Rejected: it changes shipped behaviour, and the body of "Nudge after declining an unwanted offer" would have to say it gives way. Flipping the order later changes only `declineNudge`, its test and those two requirements.

### 4. Where the mark sits and its tone

In the header, in the slot "Offer on {post}" uses (`offer.post` is null exactly when the mark can show), with the same classes: `text-muted-foreground text-xs break-words`. Text: `offer_asks_from_posts` with `count` (through `formatCount`) and `posts` (through `joinList`, locale-aware, prose). Neutral, not the warning tone: the offer follows the recipient's own setting, and `apps/web/AGENTS.md` (Look) keeps colour for meaning. "Not on your wants" is warning-toned because it flags a give against their wants.

*Alternative:* a warning line under the recipient's You give (where the asks show). Rejected: it reads as a fault in an offer their setting allows, and it splits post information between the header ("Offer on") and the body.

The MODIFIED "The post an offer is on" narrows "no line" to "no "Offer on" line", the one sentence the mark would make untrue.

### 5. Closed offers

The mark shows on every status. "Not on your wants" is the precedent: `notWanted` and `labelsOf` (`offer-side-list.tsx`) have no status gate and `fetchOffers` computes it for any status. A mark that vanished on decline would also leave the notice pointing at something no longer on the card.

*Alternative:* open offers only. Rejected for the reasons above.

### 6. Copy

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `offer_asks_from_posts` | Asks from {count} of your posts: {posts} | 내 게시물 {count}개에서 요청: {posts} | あなたの投稿{count}件から求めています：{posts} |
| `offer_nudge_one_post_title` | Want each offer to ask from one post? | 앞으로는 제안마다 게시물 하나에서만 요청받을까요? | 今後はオファーごとに1つの投稿からだけ求められるようにしますか？ |
| `offer_nudge_one_post_desc` | Turn off Let people ask from more than one post, and each offer sent after that asks from one post, which the sender chooses. | 여러 게시물에서 요청할 수 있게 하기를 끄면 이후에 받는 제안은 보내는 사람이 고른 게시물 하나에서만 요청합니다. | 「複数の投稿から求められるようにする」をオフにすると、その後に届くオファーは、送る人が選んだ1つの投稿からだけ求めるようになります。 |
| `offer_rule_turn_off` | Turn off | 끄기 | オフにする |
| `offer_rule_multi_post_off` | Let people ask from more than one post is off | 여러 게시물에서 요청할 수 있게 하기가 꺼졌습니다 | 「複数の投稿から求められるようにする」をオフにしました |
| `offer_rule_multi_post_off_error` | Couldn't turn it off. Try again in Account › General. | 끄지 못했습니다. 계정 › 일반에서 다시 시도하세요. | オフにできませんでした。アカウント › 一般でもう一度お試しください。 |

- The setting's name is the label `auth_account_multi_post_label` uses in each locale; ja quotes it in 「」 as `offer_nudge_wanted_desc` does.
- The description speaks only of offers sent after the switch, so it promises nothing about open ones.
- ko statements are 합니다체 and the title is "~할까요?"; ja questions end in ？ and ja ends with 。 where en ends with a period (the mark and the success line have none in either).
- `offer_rule_not_now` does not fit: the notice is an action toast with one action that closes on its own, like the wanted nudge. `offer_rule_turn_on` cannot be reused for a button that turns a setting off.

### 7. No `web-account` delta

General settings still lists the switch, its default and its description unchanged, and "Once saved, each offer rule SHALL apply to the next offer sent; offers already open SHALL stay" holds when the notice saves it. The notice's effect on Account › General is a scenario in `web-trade-offers`, as the wanted nudge's is.

### 8. The Messages notice goes

The owner asked for it after seeing it beside the new toast in the browser pass. `wanted-rule-notice.tsx` is deleted with its use in `chat/conversation-list.tsx`, the `WANTED_RULE_NOTICE` id, and the messages `offer_notice_wanted_title`, `offer_notice_wanted_desc` and `offer_rule_not_now`, which nothing else reads. `turnOnWantedRule` loses its export and its dismiss calls: the nudge marks itself when it shows. The id `offer-rule-only-wanted` stays in browsers that stored it and is read by nothing.

### Saving from the notice

`apps/web/src/features/offers/one-post-rule.ts` mirrors `wanted-rule.ts`: `turnOffMultiPostAsks(queryClient)` calls `client.user.setOfferRules({ multiPostAsks: false })`, then `queryClient.invalidateQueries()` (the account's rules reach the client through `currentUserOptions`, `staleTime: Infinity`, and the open offer views carry `suggestOnePost`), then the success toast; on failure the error toast and nothing dismissed beyond the nudge's own id. `nudgeOnePostRule(queryClient)` dismisses `offer-rule-one-post-nudge` and calls `addActionToast` with the title, description, `timeout: 12_000` and Turn off. A new file rather than more code in `wanted-rule.ts`, whose name and constants are about the other rule; it reuses `addActionToast`, `useNoticesStore` and `toastManager` as they are.

## Assumptions

- **Assumption:** offers sent before 2026-11-10 have `post_list_id` null (`20261110121908_offer_rules` added the column with no backfill) and their `get` items carry `list_id` as `matchEntry` gave it; such an offer that asked from two posts gets the mark on its history card, which is true of it. Not verified: whether senders then passed the picked list. Where they did not, `matchEntry` took the first list by id, so an old offer one post could hold may read "2 posts", the same kind of edge as the first-preferred one.
- **Assumption:** a counter's countered offer is always its `parent_id`, so the parent test finds the same kept objekts `counteredGives` found at send time.
- **Assumption:** `services/offer/view.ts` may import `boundOfferListSql` from `services/trade/lists.ts` without breaking the worker's import boundary; if `apps/worker/src/import-boundary.test.ts` objects, inline the same SQL.

## Risks / Trade-offs

- [The order-dependent first-preferred edge marks an offer that one post could have held] → the mark names the posts the asks were stored against, which is what the sender asked from; the send rule is out of scope.
- [A view fetched before the switch changed in another tab still says `suggestOnePost`] → the notice then offers to turn off a switch already off; saving off again is harmless, the same exposure the wanted nudge has.
- [Two subqueries more per offer the recipient reads] → both run only for the recipient's offers on no post, inside a `CASE WHEN`; `ask_posts` reads the offer's own items (`offer_item_offer_id_idx`) and a parent lookup by primary key; the lists count stops at 2.
- [Long post names make the header line long] → it wraps (`break-words`) as "Offer on {post}" does.

## Migration Plan

No migration. Deploy web (the API ships inside it). Open tabs ignore the new optional fields. Rollback: revert the code; nothing is stored.
