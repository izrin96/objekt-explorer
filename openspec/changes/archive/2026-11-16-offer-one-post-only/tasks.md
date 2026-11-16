# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=@repo/db`, `--filter=@repo/api` or `--filter=web`; `web` runs `bun run paraglide:compile` first when messages changed). Tests are `bun test` beside the code and cover pure modules only. Local checks run on the dev server against the local database (`.env.local`). Production is only read, after the deploy. Nothing here commits, pushes or runs a migration without the owner's approval.

## 1. Database: retire the column

- [x] 1.1 Remove `multiPostAsks` from `packages/db/src/auth-schema.ts` and its `additionalFields` entry in `packages/api/src/services/account/auth.ts` together (design, Decision 8). `rg "multiPostAsks|multi_post_asks" packages/db/src packages/api/src/services/account/auth.ts` finds nothing. Lint, typecheck and build pass for `@repo/db` and `@repo/api` (typecheck of `@repo/api` still fails on the readers until group 2 and 3; do 1.1 and 1.2 in the same working tree and finish with 3.x before the api checks).
- [x] 1.2 Generate the no-op migration with `bun run --filter=@repo/db db:generate` (generating writes files only; applying needs approval and is task 9.1). Replace the generated SQL with a comment saying the column is retired and the drop comes later, then `SELECT 1;`, as `20261115092944_retire_linked_list_id` does. Verify the new snapshot has no `multi_post_asks`, the SQL file holds only the comment and `SELECT 1;`, and a second `db:generate` reports no changes.
- [x] 1.3 Add `user.multi_post_asks` to the columns kept `NOT NULL DEFAULT` after retirement in `packages/db/AGENTS.md`, with the later drop (`DROP COLUMN IF EXISTS`, `lock_timeout`). `bun run format` leaves the file unchanged.

## 2. API: send path and counters

- [x] 2.1 In `packages/api/src/services/offer/core.ts`, make `offerRulesOf` return only `onlyWantedOffers` and `allowCollectionAsks` (design, Decision 1). Typecheck of `@repo/api` shows every remaining reader of `rules.multiPostAsks`, to be removed in 2.2 and 3.1.
- [x] 2.2 In `services/offer/index.ts` `createOffer`, keep one branch: with `hasLists`, `onePostVerdict(asks, postListId)` refuses `other_post` when it fails and its list is the offer's post. Delete both `multiPostAsks` retries and the `anyAsksFit` fallback; an any-copy ask draws only on `anyCopyScope` over `chosen`. Kept objekts (`counteredGives`) stay out of the verdict, so a counter is checked against the original sender's lists (Decision 2). Leave `onePostVerdict`'s order unchanged.
- [x] 2.3 In `lib/offer-recipient-rules.ts`, delete `anyAsksFit` and its tests. `bun test packages/api` passes and `rg anyAsksFit packages apps` finds nothing.
- [x] 2.4 Make the wants check read `onPost` only when the offer has an ask that is not kept (the `storedPostListId` test), else every want list on Trade, for one value serving both (Decision 3). Remove the `postWantedAmong` use for an offer that asks for nothing. If the logic fits a pure function in `lib/offer-recipient-rules.ts`, test it there: gives-only offer from a Buy post start checks every want list; an offer with an ask checks `onPost`; a counter whose asks are all kept checks every want list. `bun test packages/api` passes.
- [x] 2.5 Update the `other_post` refusal text in the API's refusal messages if the API holds its own copy (the client text is `offer_refused_other_post`, task 6.1); the code stays `other_post` so open tabs still outline picks (Decision 7). Verify `rg other_post packages/api/src` shows the code unchanged.

## 3. API: picker, view and schemas

- [x] 3.1 In `services/offer/picker/index.ts`, make `partnerRulesOf` send `onePost: hasLists` (field stays on the wire), make `suggestOffer` stop reading `offerRulesOf`, and drop the `rules` parameter of `onePostOf` so `rowPost` applies to every partner (Decision 5). Near matches are not cut to the post. Confirm the suggestion's direction is chosen after the cut to one post (spec "Row matches from one post") and fix it if the code picks it before. Extend or add a test beside `rowPost` if it lives in a pure module: most matches, a tie to the row's lead, then list order, with `bun test packages/api` passing.
- [x] 3.2 In `services/offer/view.ts` `fetchOffers`, remove `ask_posts`, `rule_one_post_suggestable`, `acrossPosts` and the `boundOfferListSql` import if unused; delete `askPostsMark` and its tests (Decision 6). `rg "askPostsMark|acrossPosts|ask_posts|rule_one_post_suggestable" packages apps` finds nothing.
- [x] 3.3 In `schemas/offer.ts`, remove `askPosts` and `suggestOnePost` from `offerViewSchema`. In `schemas/user.ts`, remove `multiPostAsks` from `offerRulesInputSchema` (and so `updateAccountInputSchema`). Stop `updateAccount` and `setOfferRules` (`services/account/`) from writing the column. Verify with a short test of the schema: `{ multiPostAsks: false }` parses to `{}` (pure, beside the schema), and `setOfferRules`'s all-undefined guard returns without a write.
- [x] 3.4 Update `packages/api/docs/offers.md` as Decision 10 lists: the first bullet's exception and `anyAsksFit` in the any-copy bullet under "Where a get item comes from"; the recipient's offer rules (two switches plus one post always, an offer that asks for nothing reads every want list, the `post_list_id` bullet without "where `multi_post_asks` allows it", the `ask_posts` bullet removed, `fetchOffers` runs no post checks, `setOfferRules` serves the wanted nudge and Account › Trade); Suggested offers (`rowPost` for every partner). Verify `rg "multi_post_asks|anyAsksFit|ask_posts" packages/api/docs` finds nothing and `bun run format` leaves it unchanged. Lint, typecheck and build pass for `@repo/api`.

## 4. Web: the builder

- [x] 4.1 In `apps/web/src/features/offers/builder/post-choice.ts`, add a pure helper (`givesPostOf`) returning `postSlug` when You get holds a non-kept pick, else null, replacing `wantPostOf` (Decision 3). Remove `NO_POST`, the `null` choice in `chosenPostOf` and `"no_post"` in `postProblem`; remove `startedPostOf` and `wantPostOf` from `form.tsx`. Update `post-choice.test.ts` and add tests for the helper: no pick gives null, only kept picks gives null, one non-kept pick gives the slug, a mix gives the slug. `bun test apps/web/src/features/offers` passes.
- [x] 4.2 In `builder/form.tsx`, always show Offer on while `partnerRules.onePost`: the select over `theirLists` with no No post for two or more posts, the line `offer_on_post` ("Offer on {post}") for one (Decision 4). `openPostOf` is unchanged. Delete the `noPost` branch of `closed` and of `ruleLine`; You get's line is `offer_rule_one_post` for every partner with lists. Wire `givesPost` through the helper from 4.1 so You give's locked switch and line follow the first ask. Verify the typecheck shows no leftover reference to the deleted names.
- [x] 4.3 Make `TheirsGrid` always receive `post` while the partner has lists: no `PickerListSelect`, no "Add from {name}'s lists", the button reads "Add from {post}". Partners with no lists keep the collection-asks path unchanged. Verify in the browser pass (task 8.2).
- [x] 4.4 In `features/offers/offer-picker-grids.tsx`, make `theirsEmpty` show the "lists nothing" empty state (`offer_picker_theirs_none_listed` and its hint) over the filters when the partner's post is set, as the spec scenario "Partner lists nothing" now reads; today a set post skips that message. Verify in the browser pass (task 8.2).
- [x] 4.5 Check each entry point of Decision 4's table lands on one post: row with a Can swap pair (`pairPost`), row with other matches (`onePostOf`, You give winning after the cut leaves You get empty), a post offer, a Market listing, Make offer for this objekt, Counter. Verify by reading `openPostOf` and its callers; fix a path that can still start without a post. Lint, typecheck and build pass for `web`.

## 5. Web: offer view and account

- [x] 5.1 Delete `features/offers/one-post-rule.ts`, `decline-nudge.ts` and its test. In `offer-body.tsx`, remove the "Asks from N of your posts" mark and make the decline call `nudgeWantedRule` when `offer.suggestWantedOnly`. Move `WANTED_RULE_NUDGE` back into `wanted-rule.ts`; the id `offer-rule-one-post-nudge` is read by nothing (Decision 6). `rg "nudgeOnePostRule|declineNudge|one-post-rule|askPosts|suggestOnePost" apps/web/src` finds nothing.
- [x] 5.2 In `features/account/sections/trade.tsx`, remove the key from `OfferRule` and `RULE_DEFAULTS`; the Offers group keeps Only offers with what I want and Let people ask for anything I hold, with their descriptions unchanged. `rg multiPostAsks apps/web/src` finds nothing.
- [x] 5.3 Update `apps/web/docs/offers.md`, Offer builder: Offer on for every partner with lists, no No post, one notice on decline. Verify `rg "No post|multi" apps/web/docs/offers.md` finds nothing stale and `bun run format` leaves it unchanged. Lint, typecheck and build pass for `web`.

## 6. i18n: en, ko, ja

- [x] 6.1 Reword `offer_refused_other_post` in `apps/web/messages` for all three locales (design, Decision 9):
  - en: `An offer asks from one post. On another of their posts: {objekts}`
  - ko: `제안 하나는 게시물 하나에서만 요청합니다. 상대방의 다른 게시물에 있습니다: {objekts}`
  - ja: `1つのオファーでは1つの投稿からだけ求められます。相手の別の投稿にあります：{objekts}`

  Verify with the browser pass (task 8.2) and that `bun run paraglide:compile` passes.
- [x] 6.2 Remove from en, ko and ja: `auth_account_multi_post_label`, `auth_account_multi_post_desc`, `offer_asks_from_posts`, `offer_nudge_one_post_title`, `offer_nudge_one_post_desc`, `offer_rule_turn_off`, `offer_rule_multi_post_off`, `offer_rule_multi_post_off_error`, `offer_post_none`, `offer_rule_no_post`, `offer_flag_no_post`. Keep `offer_post_label`, `offer_on_post`, `offer_rule_one_post`, `offer_flag_not_on_post`. Verify `bun run paraglide:compile` passes and `rg` for each removed key over `apps` and `packages` finds nothing. The Discord format output, the CSV export and the changelog stay English and are out of this pass.

## 7. Backlog and package guides

- [x] 7.1 In `design/backlog.md`, remove the item "Keep an offer inside one post (lists that do not mix)" and trim "Offer rules per post" to the two remaining rules (Only offers with what I want, collection asks): drop `multi_post_asks` from its Today line and the open question about asks across posts. Verify `rg "multi_post_asks|Keep an offer inside one post" design/backlog.md` finds nothing.
- [x] 7.2 Check `apps/web/AGENTS.md`, `packages/api/AGENTS.md` and root `AGENTS.md` for text about the multi-post switch, the No post choice, the mark or the decline notice (`rg -i "multi.post|no post|asks from" ` over each) and update what the change alters; state in the final note which files needed no change. `packages/db/AGENTS.md` is done in 1.3. `bun run format` leaves them unchanged.

## 8. Verification

- [x] 8.1 Run `bun run check` from the root: lint, typecheck and test pass. Run `bun run knip` (advisory) and read its report for unused files and exports this change left behind (expect none from the deleted names).
- [x] 8.2 Browser pass on the dev server (local DB via `.env.local`), with the `browser-use` CLI against the shared automation Chrome (`BU_CDP_URL=http://127.0.0.1:9333`). Open a tab of your own and drive it by target id; other agents may hold the shared one. Wait until the page has hydrated before submitting any login form (an early click puts credentials in the URL and log); sign-in uses the env credentials, never printed. Cover:
  - builder opened to a partner with 2 or more posts: Offer on select, no No post, no List dropdown under You get;
  - builder opened to a partner with 1 post: the plain line "Offer on {post}", no select;
  - builder opened to a partner with no lists: collection asks unchanged;
  - from a Buy post, a give-only offer to a recipient with Only offers with what I want on: passes the request boundary (read-only verified);
  - a counter on an open cross-post offer: the counter is accepted at the request boundary when its new asks fit one post;
  - a cross-post send from an old tab (stale builder state) refused with the new `offer_refused_other_post` text;
  - Account › Trade shows two switches in Offers;
  - ko and ja render the builder line, the refusal and Account › Trade.

  Report each as passed or read-only verified, and any send that would write to production as not run.

## 9. Deploy

- [ ] 9.1 With the owner's approval for this specific action, run `docker compose run --build --rm migrate` (the no-op retire migration). Do not run it unasked. Verify `migrate` exits 0 and the `user` table still has `multi_post_asks` (read-only query with `PGOPTIONS='-c default_transaction_read_only=on'`).
- [ ] 9.2 With the owner's approval, deploy web (push, then CI builds and moves `:latest`). Do not commit or push unasked. After it is live, read-only: reload Account › Trade (two switches), and open the builder to a partner with lists (Offer on, no No post).

## Workflow follow-up

- The DROP migration (`DROP COLUMN IF EXISTS "multi_post_asks"`, with `lock_timeout`) is a later change, once this build is live; it needs the owner's approval to run as well.
- Archive with spec sync after the deploy.
- After the archive, the owner decides whether to rename the scenarios in `web-trade-offers` whose names still talk about two lists ("Their List shown for one list", "Copies on two lists", "Count for copies only any serial reaches", "Same collection on a visible list", "Serials checked beside the hidden count", "One shown copy and hidden copies", both "Across posts"). A delta cannot rename a scenario.
