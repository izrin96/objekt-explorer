# Tasks

## 1. Schema

- [x] 1.1 Add to `user` (`packages/db/src/auth-schema.ts`) `onlyWantedOffers` (`only_wanted_offers`), `onePostOffers` (`one_post_offers`) and `allowCollectionAsks` (`allow_collection_asks`), each `boolean().notNull().default(false)`, and `postListId` (`integer`, references `lists.id`, `onDelete: "set null"`) to `offer` (`packages/db/src/schema.ts`). Generate one migration with `bun run --filter=@repo/db db:generate` and review its SQL. Do not apply it without the user's approval. Verify: the migration holds only the four `ADD COLUMN`s, and lint, typecheck and build pass for `@repo/db`

## 2. Setting through the API and Account

- [x] 2.1 Expose `onlyWantedOffers`, `onePostOffers` and `allowCollectionAsks` the way `showOnline` is exposed: the Better Auth `additionalFields` entry (`services/account/auth.ts`), optional fields on `user.update`'s input (`schemas/user.ts`), and the write in `services/account/user.ts`, where leaving one out keeps the stored value. Verify: a tab from before the deploy that sends none of the fields still validates; lint, typecheck and build pass for `@repo/api`
- [x] 2.2 Add the "Only offers with what I want", "Only asks from one post" and "Let people ask for anything I hold" switches and their descriptions to `features/account/sections/general.tsx`, with `en`/`ko`/`ja` strings (ko 합니다체, ja full-width ？). Verify: on `/account/general` against the local DB, all three start off, and saving keeps each on after a reload (local write only); lint, typecheck and build pass for `web`

## 3. Give-side gate

- [x] 3.1 Put the decision in a pure module in `packages/api/src/lib/` (for example `offer-wanted.ts`): given the give items, the recipient's discoverable want slugs (or null when the rule is off or there are no want lists) and the countered offer's asks, return the objekt ids that are refused. Add `*.test.ts` covering every scenario of "Recipients who take only what they want": refused, wanted, through a rule, cash buy, the counter exemption for a specific objekt and for any copy, and no want list. Verify: `bun test` passes for `@repo/api`
- [x] 3.2 Add `not_wanted` to `OFFER_REFUSALS`, and add `counteredAsks` (or widen `counteredGives`) in `services/offer/picker/shared.ts`. In `createOffer`, read the partner's `only_wanted_offers` and `wantSlugsOf(partnerId, true)`, call 3.1, and `refuseOffer("not_wanted", { objektIds })` before `checkItems`. Verify: lint, typecheck and build pass for `@repo/api`; read-only verify the refusal path up to the request boundary
- [x] 3.3 Return `wantedOnly` on the `mine` candidates page (`picker/mine.ts`) when the partner's rule is on and they have a discoverable want list. Verify: typecheck passes for `@repo/api` and `web`

## 4. Builder

- [x] 4.1 When the first `mine` page reports `wantedOnly`, start You give's "Only what they want" on, lock it, and show the line "{name} only takes objekts on their want lists" (`en`/`ko`/`ja`). Verify: in the builder against a local partner with the rule on, the switch can't be turned off and the picker shows only wanted collections; lint, typecheck and build pass for `web`
- [x] 4.2 Map `not_wanted` in `features/offers/refusal.ts` to "Not on their wants", flowing through the existing per-pick refused path (`builder/refused.tsx`), and extend `refusal.test.ts`. Verify: `bun test` passes for `web`; the "Not on their wants" scenario shows the outlined card and the banner count

## 5. Post the offer started from

- [x] 5.1 Add the optional `post` (list slug, max 12) to `createOfferInputSchema`. In `createOffer`, resolve it to the partner's list in `askableOnTrade`, else null, never refusing, and write it to `offer.post_list_id`. Send `post` from `use-send-offer.ts` as the list the builder started on: the search's `start`, else `post` when `match=post`, never `to` (design decision 5). Verify: a tab from before the deploy that sends no `post` still validates; lint, typecheck and build pass for `@repo/api` and `web`

## 6. Labels on a received offer

- [x] 6.1 In `services/offer/view.ts`, select the post's slug and name, plus per item `wanted` (against the recipient's want lists, all of them) and `asked` (an ask of `o.parent_id`). The offer carries `post` for both people, and `itemViews` sets `notWanted` and `otherPost` only when the viewer is the recipient. Put the per-item rule in a pure function with a test. Verify: `bun test` passes for `@repo/api`; `EXPLAIN` of the read on production with `PGOPTIONS='-c default_transaction_read_only=on'` shows no sequential scan of `list_entries`
- [x] 6.2 Render "Not on your wants" and "From another post" in `offer-item.tsx`, "Offer on {post}" on `offer-card.tsx` and `offer-body.tsx` for both people, and the same line in the builder header (`builder/header.tsx`) from the post it started on, with `en`/`ko`/`ja` strings. Verify: as the recipient in a local thread both labels show and the sender sees neither, both see "Offer on {post}", and the builder opened from a post or a Market listing shows it before any pick; Accept stays enabled; lint, typecheck and build pass for `web`
- [x] 6.3 Add `suggestWantedOnly` to the recipient's offer view (design decision 15), and the decline nudge toast in `features/offers/actions.ts`: Turn on calls `user.setOfferRules({ onlyWantedOffers: true })` and refreshes the session, and the dismissal is kept in `useNoticesStore`. Strings in `en`/`ko`/`ja`. Verify: against the local DB, declining an offer with a "Not on your wants" item shows the toast, Turn on leaves the switch on in `/account/general` after a reload, and after a dismiss a second decline shows nothing; none of the "No nudge" scenarios show it; lint, typecheck and build pass for `web`

## 7. Only asks from one post gate

- [x] 7.1 Put the rule in a pure module beside 3.1 (design decision 11): given the get items with their candidate list ids, the recipient's `askableOnTrade` lists, the resolved post and the kept objekt ids, return the chosen list or the refused items. Add `*.test.ts` covering every scenario of "Recipients who take asks from one post", including an objekt on two posts and the counter's kept objekt. Verify: `bun test` passes for `@repo/api`
- [x] 7.2 Add `other_post` to `OFFER_REFUSALS`. In `createOffer`, read `one_post_offers` and call 7.1 after the get rows are matched. Store each item's `list_id` as the chosen list, and `refuseOffer("other_post", { objektIds, collectionSlugs })` when it fails. Verify: lint, typecheck and build pass for `@repo/api`; read-only verify the refusal path up to the request boundary
- [x] 7.3 Return `onePost` on the `theirs` candidates page (`picker/theirs.ts`). In the builder, drop All their lists from You get's List, open it as design decision 13 says, show the line "{name} takes asks from only one post in each offer", mark picks not on the chosen list "Not on {list}", and map `other_post` in `refusal.ts` (extend `refusal.test.ts`). Strings in `en`/`ko`/`ja`. Verify: `bun test` passes for `web`; against a local partner with the setting on, the "Switching the list" scenario disables Send with the pick outlined; lint, typecheck and build pass for `web`
- [x] 7.4 In `suggestOffer`, when no `post` is given and the matches are You get outside a Can swap pair, pick the partner list with the most get matches (tie: the row's lead post), rerun in post mode on it, and return its slug. The builder names it in the line and opens List on it. Put the choice (counts per list, then the tie rule) in a pure function with a test for each scenario of "Row matches from one post". Verify: `bun test` passes for `@repo/api`; against a local partner with matches on two posts, Make offer on the row opens with only the bigger post's matches, Offer on on that post, and Send enabled; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 7.5 Make collection asks opt-in (design decision 14): in `createOffer`, when the partner has no list on Trade and `allow_collection_asks` is off, refuse every non-kept get item `not_listed`. `theirs` returns `asksClosed`, and the builder shows the line in place of You get's Add button. Put the decision in the pure module from 7.1 with tests for "Collection ask by default", "Giving to someone with no lists" and the counter's kept objekt. Verify: `bun test` passes for `@repo/api`; against a local partner with no lists and the setting off, the builder shows the line and a gives-only offer sends (local write only); lint, typecheck and build pass for `@repo/api` and `web`
- [x] 7.6 Add the one-time Messages notice (design decision 18) with Turn on and Not now, strings in `en`/`ko`/`ja`. Verify: against the local DB an account with a want list on Trade and the setting off sees it once, Turn on saves the setting, and an account with no want list on Trade never sees it; lint, typecheck and build pass for `web`

## 8. One post per offer for everyone

- [x] 8.1 Drop the switch: remove `onePostOffers` from `auth-schema.ts`, the Better Auth `additionalFields`, `offerRulesInputSchema`, `services/account/user.ts` and `offerRulesOf`, then generate a migration that drops `user.one_post_offers` with `IF EXISTS`. Verify: the migration holds only that drop; lint, typecheck and build pass for `@repo/db` and `@repo/api`
- [x] 8.2 In `createOffer`, call `onePostVerdict` for every recipient with a list on Trade; in `suggestOffer`, pick one post whenever no `post` is given; drop `onePost` from `PartnerRules`. Verify: `bun test` passes for `@repo/api`; lint, typecheck and build pass for `@repo/api`
- [x] 8.3 Remove "From another post": `otherPost` from the item view schema, `itemLabels` and its tests, `offer-side-list.tsx` and the `offer_label_other_post*` strings. Verify: `bun test` passes for `@repo/api` and `web`
- [x] 8.4 In the builder, add the Offer on choice to the header (design decision 13), fix You get's picker to that post with no List choice, label its button "Add from {post}", mark picks "Not on {post}" or "No post chosen", show the line under You get, and send the choice as `post`. Remove the third switch from `/account/general`. Strings in `en`/`ko`/`ja`. Verify: against the local partner `lcvelettzr`, the "Choosing the post" scenarios hold; `/account/general` shows two switches; lint, typecheck and build pass for `web`

## 10. Per-post wants and review fixes

- [x] 10.1 Gate Only offers with what I want on the post's own want list (design decision 1): `postWantedAmong` in `picker/shared.ts`, no post through `wantedAmong`, an empty want list counting as none; `PartnerList.want` from `partnerListChoices`; `partnerRules` gains `wantsOnTrade`. In the builder, `giveRule` (`builder/post-choice.ts`, tested) decides the lock, the line and the picker's `wantList`. Strings in `en`/`ko`/`ja`. Verify: against `cansw-same`, Offer on "p have" locks the switch to "p want" and No post falls back to all want lists; lint, typecheck and tests pass for `@repo/api` and `web`
- [x] 10.2 Review fixes: a Can swap row's `suggestOffer` returns the pair's post; a kept objekt keeps its own `list_id`; an offer that asks nothing stores no post on the server too; the `postListId` comment; `byCollection` and the any-copy scope read the chosen post's entries, not the first list that fits; `partnerRules` is read only on the builder's whole theirs page, and a closed collection is checked by `allow_collection_asks` alone. Verify: typecheck passes for `@repo/api`

## 11. Let people ask from more than one post

- [x] 11.1 Add `user.multi_post_asks` (default true) through the Better Auth fields, `offerRulesInputSchema`, `services/account/user.ts` and `offerRulesOf`, with its migration; skip the `other_post` refusal while it is on, storing no post for an offer across posts; `partnerRules.onePost`; `suggestOffer` narrows row matches only while it is off. Verify: typecheck passes for `@repo/db` and `@repo/api`
- [x] 11.2 In the builder, show Offer on and fix the picker only for a one-post partner; otherwise the List choice with All their lists and "Offer on {post}" when started from a post (`startedPostOf`, tested). Add the switch to `/account/general` with `en`/`ko`/`ja` strings. Verify: against the local DB (after the migration), a default partner gets the List choice and a partner with the switch off gets Offer on; lint, typecheck and tests pass for `web`

- [x] 11.3 Second review fixes: with asks across posts allowed, a named post the asks don't fit is retried as no post, and the builder reads the post gives are checked against as the server does (`wantPostOf`, tested); a row's matches pick You get or You give again once You get keeps one post; `fetchOffers(ids, reader)` runs the want-list checks only for offers sent to the reader (the report passes none); the Messages notice is dismissed only once the rule is saved. Verify: `bun run check` passes; the thread for conversation 398 still shows "Not on your wants" to the recipient

## 9. Wrap-up

- [x] 9.1 Run `bun run check` and `bun run build --filter=web`. Verify: all pass
- [x] 9.2 Update `packages/api/AGENTS.md` with the three gates, the collection-ask default (off for everyone): the give gate's want-list set (discoverable) is different from the labels' set (all), the counter exemptions, the one-list rule (the reason it never trusts `post` alone), and one post per offer for everyone, with `post_list_id` storing the post. State that `apps/web/AGENTS.md` and `packages/db/AGENTS.md` need no change, or update them if they do. Verify: the doc names the files above

## Workflow follow-up

- Apply the migrations `20261110121908_offer_rules`, `20261110131530_offer_post_list_idx` the drop from 8.1 and `multi_post_asks` locally, then on production only with the user's approval.
- `/opsx:archive` once shipped.
