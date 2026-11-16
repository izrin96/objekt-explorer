# Design

## Context

See proposal.md for why. Current state that shapes the approach:

- **Send path.** `createOffer` (`packages/api/src/services/offer/index.ts`) serves new offers, replacements and counters alike. It reads the recipient's rules through `offerRulesOf(partnerId)` (`services/offer/core.ts`), where `partnerId` is whoever receives this offer: for a counter, the original sender. When the recipient has a have or sale list on Trade (`hasLists`), it builds each ask's candidate lists and calls `onePostVerdict` (`lib/offer-recipient-rules.ts`). With `multiPostAsks` on, a failed verdict, or one whose chosen list cannot hold the any-copy asks (`anyAsksFit`), stores the offer on no post; with it off, the verdict refuses `other_post`. Kept objekts (the recipient's own gives in the countered offer, `counteredGives`) are left out of the verdict.
- **What is stored.** `offer.post_list_id` is null for an offer that asks nothing, asks only kept objekts, or asks across posts. Only offers with what I want checks gives against `onPost`: the verdict's list, else the client's `post`, also for an offer that asks nothing (`postWantedAmong`), else every want list on Trade (`wantedAmong`).
- **Picker and matches.** `partnerRulesOf` (`services/offer/picker/index.ts`) sends the builder `onePost: hasLists && !rules.multiPostAsks`. `suggestOffer` reads `offerRulesOf` only for `onePostOf`, which cuts a row's You get matches outside a Can swap pair to the post with the most of them (`rowPost`: most matches, a tie to the row's lead, then list order).
- **Builder.** `BuilderForm` (`apps/web/src/features/offers/builder/form.tsx`) has two branches. With `onePost`, the header holds the Offer on select over `theirLists` plus No post, `TheirsGrid` gets `post` (no `PickerListSelect`), and `postProblem` marks picks off the post or under No post. Without it, `startedPostOf` names the post the builder started from, `wantPostOf` guesses the post `createOffer` will read gives against, and the picker offers List. `partnerListChoices` returns only have and sale lists, so a Buy post (a want list leading its post) is never an Offer on choice.
- **Offer view.** `fetchOffers` (`services/offer/view.ts`) computes `ask_posts` and `rule_one_post_suggestable` for the recipient of an offer on no post; `askPostsMark` turns them into `askPosts` and `suggestOnePost`. `offer-body.tsx` shows the mark and, on decline, `declineNudge` (`features/offers/decline-nudge.ts`) picks between `nudgeWantedRule` and `nudgeOnePostRule` (`one-post-rule.ts`).
- **Production, read-only, 2026-11-16.** 6 of 4,555 users have the switch off. Of 2,973 offers sent since 2026-11-10, 79 are stored across posts; 6 such offers are open, the last expiring within 7 days (`expires_at` is 7 days after sending). 76 users have Only offers with what I want on; 14 of them also have a Buy post beside a have or sale post.

## Goals / Non-Goals

**Goals:** one rule, applied by `createOffer` to every send; the builder that cannot build a refused offer; every reader and writer of `multi_post_asks` gone in one build, with the column dropped later; open tabs keep working.

**Non-Goals:** changing `onePostVerdict`'s order; narrowing near matches to the post; removing the picker's code for copies from two lists in one tile; any change to accept, which never checks the rule.

## Decisions

### 1. The send rule is always on

`createOffer` keeps one branch: with `hasLists`, `onePostVerdict(asks, postListId)` refuses `other_post` when it fails, and its list is the offer's post. The two `rules.multiPostAsks` retries and the `anyAsksFit` fallback go. An any-copy ask then draws only on the chosen list's copies (`anyCopyScope` over `chosen`), so asks needing copies from two lists are refused by `checkItems`, as they are today for a recipient with the switch off. `anyAsksFit` loses its last caller and is deleted with its tests. `offerRulesOf` returns `onlyWantedOffers` and `allowCollectionAsks`.

`onePostVerdict` stays as it is, first-preferred edge included: the builder now always names a post, so the edge is reached only by a request without one (an open tab from before the deploy).

*Alternative:* keep `multiPostAsks` in code, hard-wired false. Rejected: dead branches in the one function every offer passes.

### 2. Counters

Verified in code: a counter goes through `createOffer` like any offer, so the rule is checked against the counter's recipient, the original sender, and a counter's asks come from the original sender's lists. Kept objekts stay exempt. Before, this applied only when the original sender had the switch off; now it applies whenever they have a list on Trade.

A counter on an open offer across posts is allowed. The counter's You get is the original sender's gives, which are kept; the posts the original offer asked from are the counterer's own, now under You give, which no post rule checks. Any new ask in the counter must fit one of the original sender's posts. A sender replacing their own offer across posts sends a new offer, held to one post. A counter of that counter keeps the gives it received, exempt the same way.

### 3. An offer that asks for nothing is checked against every want list

Removing No post would otherwise tighten Only offers with what I want for gives-only offers. A seller who opens the builder from a Buy post today sends no `post` (a Buy post is not a have or sale list), so the gives are checked against every want list on Trade. With Offer on always set, the builder would send the partner's first have list, and gives on the Buy post's want list would be refused as not wanted. 14 users have that setup.

So the wants check reads `onPost` only when the offer has an ask that is not kept, the same test that already makes such an offer stored on no post (`storedPostListId`). Otherwise it reads every want list on Trade. One value serves both. In the builder, `givesPost` is `postSlug` when You get holds a non-kept pick, else null, through a pure helper in `builder/post-choice.ts` (tested) that replaces `wantPostOf`. You give's locked switch and its line follow it, so they change when the first ask is added.

It moves two cases, both for an offer that asks for nothing, to the rule for no post. That matches "The post an offer is on", which already stores such an offer on no post:

- **Looser:** an offer started from a WTT post with its own want list could give only from that list; now any of the partner's want lists on Trade counts.
- **Tighter:** an offer on a post without a want list (an "extras" posted alone) took any give; now each give must be on one of the partner's want lists on Trade, when they have one.

*Alternative:* keep reading the client's post for an offer that asks nothing. Rejected: sellers to a Buy post would be refused. *Alternative:* the same rule, but a post without a want list still takes anything. Rejected: it keeps the builder's choice of post deciding the gives of an offer that is stored on no post. It is one condition to add if the owner prefers it. *Alternative:* offer Buy posts under Offer on. Rejected: a Buy post has nothing to ask from, and it widens the change.

The owner confirmed this on 2026-11-16, without the condition for a post that has no want list. It changes "Recipients who take only what they want" and "Builder for a want-only recipient".

### 4. The builder

`onePost` stays `partnerRules.onePost`, which the server now sends as `hasLists`.

- **Offer on.** With two or more posts, the select over `theirLists` with no No post. With one, the line "Offer on {post}" (`offer_on_post`, the paragraph the other branch already draws): a select with one option is a control that does nothing. Owner decision 2 asked for the chooser whenever the partner has lists; this is the one exception, and the owner confirmed it on 2026-11-16.
- **Where it opens.** `openPostOf` is unchanged: the post started from (a post, a Market listing, one objekt of a post), the matches' post, the row's lead when it is a have or sale list, the first prefilled get pick's list, else the partner's first list.
- **Picker.** `TheirsGrid` always gets `post` while the partner has lists, so You get never shows `PickerListSelect`, "Add from {name}'s lists" goes and the button reads "Add from {post}".
- **Deleted:** `NO_POST`, the `null` choice in `chosenPostOf`, `"no_post"` in `postProblem`, `startedPostOf`, `wantPostOf`, the `noPost` branch of `closed` and of `ruleLine`, with their tests. You get's line is `offer_rule_one_post` for every partner with lists.

Every entry point lands on one post:

| Start | Post |
| --- | --- |
| Row, Can swap pair | the pair's post (`pairPost`), as today |
| Row, other matches | `onePostOf`, now for every partner: most matches, a tie to the lead, then list order; when You give wins after the cut, You get stays empty and Offer on opens on the lead or the first list |
| Make offer on this post, post page, post card in chat | `matches.post`, its lists only (`postListsOf`) |
| Market listing, Make offer for this objekt | `startList` |
| Conversation, Counter | the first get pick's list, else the partner's first list |

### 5. Picker server

`partnerRulesOf` sends `onePost: hasLists`. The field stays on the wire because tabs from before the deploy read it to show Offer on. `suggestOffer` stops reading `offerRulesOf`, and `onePostOf` loses its `rules` parameter.

Near matches are not cut to the post. A near ask from another post shows as "Not on {post}" with Remove them, as it does today for a partner with the switch off.

### 6. The mark and the decline notice go

The notice's only action is the switch, so it goes with it. The mark would now show only on the 6 open offers across posts and on past ones. A status gate would keep it for at most 7 days and then need a second removal. Without a gate it would stay on closed cards for good, pointing at a rule that no longer exists. Keeping it costs two subqueries on every received offer on no post. An offer that loses it shows no post line, like an offer that asks nothing; its items, and accept, decline and counter, are unchanged.

Removed: `ask_posts`, `rule_one_post_suggestable` and `acrossPosts` in `fetchOffers` (and its `boundOfferListSql` import if unused), `askPostsMark` and its tests, `askPosts` and `suggestOnePost` in `offerViewSchema` (optional, so tabs from before read them as absent), `one-post-rule.ts`, `decline-nudge.ts` and its test. `OfferBody`'s decline calls `nudgeWantedRule` when `offer.suggestWantedOnly`; `nudgeWantedRule` already checks its own id. `WANTED_RULE_NUDGE` moves back into `wanted-rule.ts`. The id `offer-rule-one-post-nudge` stays in browsers that stored it, read by nothing.

*Alternative:* keep the mark only on open offers. Rejected for the reasons above.

### 7. Inputs stay compatible

- `multiPostAsks` leaves `offerRulesInputSchema` (`schemas/user.ts`), and so `updateAccountInputSchema`, which extends it. Zod 4's `z.object` strips unknown keys, so an open tab's `{ multiPostAsks: false }` still validates, parses to `{}`, and `setOfferRules`'s all-undefined guard returns without a write. Keeping the field in the schema while the service ignores it would break this: the guard would pass and Drizzle's `.set()` would get only undefined values and throw. `updateAccount` and `setOfferRules` stop writing the column. The General form sends no offer rule.
- `/api/v1`: `openApiRouter` mounts only `user.search` from the user router and nothing from the offer router, so no public caller sends `multiPostAsks`, `post` or `offer.create`.
- `other_post` stays the refusal code, so tabs from before still outline the picks; only its text changes (Decision 9).
- An open tab still showing the switch can flip it; nothing is stored, and its toast says it saved. A reload removes the switch.

### 8. The column: retire now, drop later

`multiPostAsks` leaves `packages/db/src/auth-schema.ts` and the `additionalFields` in `services/account/auth.ts` together: Better Auth maps each additional field to a column of its table. This change carries a no-op migration that records that, as `20261115092944_retire_linked_list_id` did. Generate it with `bun run --filter=@repo/db db:generate` so its snapshot drops the column. Then replace its SQL with a comment and `SELECT 1;`. Without it, the next `db:generate` writes the `DROP COLUMN` into an unrelated change. The column keeps `NOT NULL DEFAULT true`, so Better Auth's insert of a new user without it still works, and the build live while `migrate` runs still reads it. A later change drops it (`DROP COLUMN IF EXISTS "multi_post_asks"`, with `lock_timeout` as `20261115125616_drop_linked_list_id`) once this build is live. Both migrations need the owner's approval to run. `packages/db/AGENTS.md` adds `user.multi_post_asks` to the columns kept that way.

### 9. Account › Trade and copy

The Offers group keeps Only offers with what I want and Let people ask for anything I hold; `OfferRule` and `RULE_DEFAULTS` in `features/account/sections/trade.tsx` lose the key. Their descriptions stay: "an offer not on a post" in Only offers with what I want's still covers an offer that asks for nothing.

No new line in Account › Trade or the composer. There is nothing to set, and the builder's `offer_rule_one_post` under You get ("An offer asks from one post. To ask from another, send another offer once this one closes.") already says it on every offer to a partner with lists. The refusal says it too:

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `offer_refused_other_post` | An offer asks from one post. On another of their posts: {objekts} | 제안 하나는 게시물 하나에서만 요청합니다. 상대방의 다른 게시물에 있습니다: {objekts} | 1つのオファーでは1つの投稿からだけ求められます。相手の別の投稿にあります：{objekts} |

The first sentence in ko and ja is the first sentence of `offer_rule_one_post` in each.

Messages removed in en, ko and ja: `auth_account_multi_post_label`, `auth_account_multi_post_desc`, `offer_asks_from_posts`, `offer_nudge_one_post_title`, `offer_nudge_one_post_desc`, `offer_rule_turn_off`, `offer_rule_multi_post_off`, `offer_rule_multi_post_off_error`, `offer_post_none`, `offer_rule_no_post`, `offer_flag_no_post`. Kept: `offer_post_label`, `offer_on_post`, `offer_rule_one_post`, `offer_flag_not_on_post`.

### 10. Docs

- `packages/api/docs/offers.md`:
  - Where a get item comes from: the first bullet's exception, and `anyAsksFit` in the any-copy bullet.
  - The recipient's offer rules: two switches plus one post always; an offer that asks for nothing reads every want list; the `post_list_id` bullet without "where `multi_post_asks` allows it"; the `ask_posts` bullet goes; `fetchOffers` runs no post checks; `setOfferRules` serves the wanted nudge and Account › Trade.
  - Suggested offers: `rowPost` for every partner.
- `apps/web/docs/offers.md`, Offer builder: Offer on for every partner with lists, no No post, one notice on decline.

### Notes for the spec deltas

- "Prefilled overlap" (`web-trade-for-you`): 3 on "doubles", 2 on "spares" and 3 the user has on "wants" open with the 3 from "doubles" under You get, nothing under You give, and the line "Added from doubles: 3 you get". After the cut, You give's 3 do not beat You get's 3.
- "Post offer asks from another list" and "Asking past the post" become refusals as from another post. "Conversation after a post offer" asks from one of the user's posts.
- "Post without a want list" (Recipients who take only what they want) and "Changing to a post without a want list" (Builder for a want-only recipient) hold only for an offer that asks from that post; add a scenario for an offer that asks for nothing (Decision 3).
- The scenarios of "Matches added when the builder opens" that put picks under You get outside a Can swap pair take them from one post, as "Row matches from one post" now always applies.
- The scenarios that mix "quiet haves" with "spares", or "doubles" with "spares", in one You get picker are rewritten onto one list or dropped where they need two.

## Risks / Trade-offs

- [A sender who wants objekts from two posts must wait for the first offer to close, since sending again replaces it] → the builder's line says so, and `offer_one_open` is a non-goal here. 79 of 2,973 offers since 2026-11-10 were stored across posts.
- [An offer that asks for nothing is judged against every want list, not the post's: looser on a post with a want list, tighter on one without] → the owner confirmed Decision 3 on 2026-11-16.
- [A request without `post` (an open tab) whose first ask was picked from a list that cannot hold the rest is refused, though another list holds every ask] → only such tabs reach it; their builder already shows Offer on, since `onePost` is now true.
- [Near matches under You get may come from another post] → marked "Not on {post}" and removable, as today for partners with the switch off.
- [The picker's code for copies from two lists in one tile stays, unreachable for You get] → left for a cleanup; removing it here would widen the change.
- [The 6 open offers across posts lose their mark] → their cards read as an offer on no post until they end.

## Migration Plan

1. With the owner's approval, run `docker compose run --build --rm migrate` (the no-op retire migration), then deploy web.
2. Open tabs keep working (Decision 7); a reload shows the new builder and settings.
3. Rollback: revert the code. The column and its values were never written to after the deploy, so the 6 users' switch comes back as they left it.
4. Later change: the drop migration, once this build is live.

## Open Questions

- When the drop migration ships; it can wait for any later change to `packages/db`.
