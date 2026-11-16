# Tasks

The give rule table is design.md Decision 1. Rows below cite it as "row N". Production is read-only: no task connects to a database. Tests cover pure modules only. Run the web checks after `bun run paraglide:compile` from `apps/web`, or through Turbo from the root. `packages/api` has no `build` script: it ships inside the web build, so its build check is `bun run build --filter=web`.

## 0. Already in the working tree

- [x] 0.1 `givesPostOf` (and its tests) is gone from `apps/web/src/features/offers/builder/post-choice.ts`. `storedPostOf` (and its tests) is gone from `packages/api/src/lib/offer-recipient-rules.ts`. Both stay gone. Everything else in the current diff is replaced by the tasks below: `form.tsx`'s `gives`, `createOffer`'s `onPost` check, both `docs/offers.md`, the `schema.ts` comment and the changelog line.

## 1. API: the give rule (pure)

- [x] 1.1 In `packages/api/src/lib/offer-recipient-rules.ts`, add and export:
  ```ts
  export type GivesCheck = { post: number } | { want: number } | "every";
  export function givesRuleOf(i: {
    newAsk: boolean; // an ask that is not a kept objekt
    counter: boolean; // input.counters !== undefined
    onPost: number | null; // resolved `post`, else the list the asks fit
    wantList: number | null; // resolved `wantList`
  }): { check: GivesCheck; stored: number | null };
  ```
  Logic, in order:
  - `newAsk`: `check = onPost === null ? "every" : { post: onPost }`, `stored = onPost`.
  - `counter`: `"every"`, `stored = null`.
  - `wantList !== null`: `{ want: wantList }`, `stored = onPost`.
  - `onPost !== null`: `{ post: onPost }`, `stored = onPost`.
  - else: `"every"`, `null`.

  Write a one-line doc comment pointing to `web-trade-offers` Recipients who take only what they want.
- [x] 1.2 Add `describe("givesRuleOf")` to `offer-recipient-rules.test.ts`, one test per row:
  - new ask on post 7 → `{post:7}`/7;
  - new ask, no post → `"every"`/null;
  - new ask with `wantList` 9 → still `{post:7}` (the start is ignored once it asks);
  - counter with no new ask and post 7 and `wantList` 9 → `"every"`/null;
  - start 9, no post → `{want:9}`/null;
  - start 9 with post 7 → `{want:9}`/7;
  - gives-only on post 7 → `{post:7}`/7;
  - gives-only, no post → `"every"`/null.

  Verify: `cd packages/api && bun test src/lib/offer-recipient-rules.test.ts`; then `bun run lint --filter=@repo/api && bun run typecheck --filter=@repo/api && bun run test --filter=@repo/api && bun run build --filter=web` pass.
  Checked against the code: `unwantedGives(gives, new Set(), asked)` returns every give not in `asked` (rows 3 and 7), and `onePostVerdict` with no non-kept ask returns `listId: null`, so `onPost` stays the resolved `post` for gives-only offers.

## 2. API: create

- [x] 2.1 `packages/api/src/schemas/offer.ts`: add to `createOfferInputSchema` after `post`:
  ```ts
  /** the want list a gives-only offer started from (a Buy post's): its gives are held to it */
  wantList: z.string().min(1).max(12).optional(),
  ```
  Optional, so a tab from before the deploy validates unchanged. Verify: `bun run typecheck --filter=@repo/api`.
- [x] 2.2 `packages/api/src/services/offer/core.ts`: beside `resolvePostList`, add `resolveWantList(partnerId, slug: string | undefined)`. It returns the id of the partner's list with that slug, `listType = 'want'`, `discoverable`, and at least one entry (`EXISTS` on `listEntries`, one statement), else null. `undefined` returns null without a query. Verify: `bun run typecheck --filter=@repo/api`.
- [x] 2.3 `packages/api/src/services/offer/picker/shared.ts`: add `wantListWantedAmong(wantListId: number, slugs: string[])` = `wantedOn(and(eq(lists.id, wantListId), eq(lists.listType, "want"), eq(lists.discoverable, true)), slugs)`. Rewrite the doc comment of `postWantedAmong`: null means the post has no want list (or an empty one), which callers now read as "no objekts" (the comment now says "which takes anything"). Fix the `PartnerRules.wantedOnly` doc in the same file ("a post without one takes anything") to: "gives come from one want list (`web-trade-offers`); a post without one takes no objekts". Verify: `bun run typecheck --filter=@repo/api`.
- [x] 2.4 `packages/api/src/services/offer/index.ts` `createOffer`:
  - Add `resolveWantList(partnerId, input.wantList)` as a ninth element of the first `Promise.all`, named `wantListId`.
  - After the `if (hasLists) {…}` block, compute:
    ```ts
    const { check, stored } = givesRuleOf({
      newAsk: getRows.some((row) => !keptObjekt(row.item)),
      counter: input.counters !== undefined,
      onPost,
      wantList: wantListId,
    });
    ```
  - In the `rules.onlyWantedOffers` branch, the first element of the existing `Promise.all` becomes:
    - `check === "every"` → `wantedAmong(partnerId, slugs)`;
    - `"post" in check` → `postWantedAmong(check.post, slugs).then((w) => w ?? new Set<string>())`;
    - else → `wantListWantedAmong(check.want, slugs).then((w) => w ?? new Set<string>())`.

    An empty `Set` makes `unwantedGives` refuse every give that `counteredAsks` does not exempt (rows 3 and 7). Replace the comment above it with: `// one want list, or every one (web-trade-offers); a post without one takes no objekts`.
  - The insert writes `postListId: stored`, and `postId`'s sub-select reads `stored`.
  - Import `givesRuleOf`, `resolveWantList` and `wantListWantedAmong`.

  Verify: `bun run lint --filter=@repo/api && bun run typecheck --filter=@repo/api && bun run test --filter=@repo/api && bun run build --filter=web`.
- [x] 2.5 `packages/db/src/schema.ts`: replace the `postListId` comment with:
  ```
  the recipient's have or sale post the offer is on: the sender's choice, else the one every
  ask came from; null for a partner with no posts, a counter asking only for kept objekts, a
  gives-only offer started from a want list (a Buy post), or a client that named no post.
  It is the offer's history, which every reader uses (`packages/api/docs/offers.md`)
  ```
  Comment-only, so no migration. Verify: `bun run lint --filter=@repo/db && bun run typecheck --filter=@repo/db && bun run build --filter=web`, and read the `schema.ts` diff: only the comment changed.
- [x] 2.6 Read-only verify. Trace `offer.create` inputs through `createOffer` to the insert, without sending, for:
  - (a) no get, `post: "doubles"`, no `wantList` → `postWantedAmong`, stored doubles;
  - (b) no get, `wantList: "lookingfor"`, no `post` → `wantListWantedAmong`, stored null;
  - (c) `counters` set, every get kept → `wantedAmong`, stored null;
  - (d) a new ask on a post without a want list, with one give → refused `not_wanted`.

  Record the result as "read-only verified". Verify: `bun run lint --filter=@repo/api && bun run typecheck --filter=@repo/api && bun run test --filter=@repo/api && bun run build --filter=web`.

## 3. API: picker and suggestions

- [x] 3.1 `packages/api/src/services/offer/picker/theirs.ts` `partnerListChoices`:
  - Return `{ lists: PartnerList[]; wantLists: { slug: string; name: string }[] }` from one statement.
  - Widen the `where` to `and(eq(lists.userId, addressed.partnerId), or(askableOnTrade, and(eq(lists.listType, "want"), eq(lists.discoverable, true))))`.
  - Add a selected column `filled: sql<boolean>` = `EXISTS (SELECT 1 FROM list_entries WHERE list_id = lists.id)`.
  - Map have and sale rows as today. Want rows with `filled` go to `wantLists` as `{ slug, name }`.
  - Change the want-half join comment ("an empty want list takes anything, as `postWantedAmong` reads it") to: "an empty want list counts as none, as `postWantedAmong` reads it".
  - Update callers of `partnerListChoices` (only `sidePage`, 3.2). Verify: `bun run typecheck --filter=@repo/api`.
- [x] 3.2 `picker/shared.ts`: add `wantLists?: { slug: string; name: string }[]` to `CandidatesPage`, documented as "theirs, whole list only: the partner's want lists on Trade with entries, which a start may name". In `picker/index.ts` `sidePage`, spread `{ ...page, lists: choices.lists, wantLists: choices.wantLists }`. Add no new `await`. Verify: `bun run typecheck --filter=@repo/api`.
- [x] 3.3 `picker/index.ts` `suggestOffer`, cut You give to one want list:
  - Add `oneWantOf(partnerId, giveMatches, lead)` beside `onePostOf`:
    - count `partnerListIds` per match, as `onePostOf` does;
    - read `id, slug, name` from `lists` where `userId = partnerId`, `id` in the counted ids, `listType = 'want'`, `discoverable`, ordered by `id`;
    - `leadId` = the row whose slug is `lead`;
    - return `rows.find(id === rowPost(counts, ids, leadId))` or null.
  - Replace the block from `const leadPost` to `const giveMatches` with:
    ```ts
    const rowCut = post === undefined && !swapPair;
    const giveAll = rowCut ? matchesThrough(partner?.iHaveTheyWant ?? [], undefined) : [];
    const [leadPost, giveWant] = await Promise.all([
      rowCut && filled.get.length > 0 ? onePostOf(partnerId, filled.get, lead) : null,
      rowCut && giveAll.length > 0 ? oneWantOf(partnerId, giveAll, lead) : null,
    ]);
    const onPostGet = leadPost
      ? filled.get.filter((match) => match.partnerListIds.includes(leadPost.id))
      : filled.get;
    const giveOne = giveWant
      ? giveAll.filter((match) => match.partnerListIds.includes(giveWant.id))
      : [];
    const giveWins = rowCut && giveOne.length > onPostGet.length;
    const onePost = giveWins ? null : leadPost;
    const getMatches = giveWins ? [] : onPostGet;
    const giveMatches = rowCut ? (giveWins ? giveOne : []) : filled.give;
    ```
  - Add `wantSlug: string | null` to `Suggestion` and to `empty` (null).
  - Return `wantSlug: giveWins ? giveWant!.slug : null`, and `postName: giveWins ? giveWant!.name : <today's expression>`. `postSlug` is unchanged, so it is null when You give wins.
  - Update the doc comment of `suggestOffer`: You give is cut to one want list as You get is to one post.

  Verify the three cases by reading the code:
  - get-only rows are unchanged;
  - a row with give matches only, on two want lists, keeps the larger one;
  - a `post` start never calls `oneWantOf`.

  Then `bun run lint --filter=@repo/api && bun run typecheck --filter=@repo/api && bun run test --filter=@repo/api && bun run build --filter=web`.

## 4. Web: the rule (pure)

- [x] 4.1 `apps/web/src/features/offers/builder/post-choice.ts`:
  - `Post` becomes `{ slug: string; want?: string | null }`. In `openPostOf`, `asPost(slug)` returns `posts.find((p) => p.slug === slug || (p.want != null && p.want === slug))?.slug`. The doc comment adds: "a want list names the post it pairs with".
  - Add `startWantOf(posts, wantLists: readonly { slug: string }[], from: { matchesPost?: string; addedWant?: string | null; target?: string }): string | undefined`. It returns the first of `matchesPost`, `addedWant` and `target` that is in `wantLists` and is no post's `want`.
  - Add `offerOnOf(i: { postSlug: string | null; posts: readonly { slug: string; want: string | null }[]; startWant: string | undefined; newAsk: boolean; counter: boolean })`. It returns `{ gives: { want: string; start: boolean } | "none" | "every"; input: { post?: string; wantList?: string } }`, with `post = posts.find(slug === postSlug) ?? null`. In order:
    - `newAsk`: no post → `"every"`, `{}`; `post.want === null` → `"none"`, `{ post }`; else `{ want: post.want, start: false }`, `{ post }`.
    - `counter`: `"every"`, `{}`.
    - `startWant`: `{ want: startWant, start: true }`, `{ wantList: startWant }`.
    - post with want: `{ want, start: false }`, `{ post }`.
    - post without want: `"none"`, `{ post }`.
    - else: `"every"`, `{}`.
  - Change `giveRule(rules, gives)` to take that `gives`. Its doc comment: "Which want list Only offers with what I want holds You give to: one list, none on a post without one, every want list on Trade; null where nothing is filtered." It returns `null` when `!rules?.wantedOnly`; `{ want }` for an object; `"none"` for `"none"`; `rules.wantsOnTrade ? "all" : null` for `"every"`. Its return type becomes `{ want: string } | "all" | "none" | null`. Verify: `bun test` in 4.2; the typecheck runs after 5.4, which updates `form.tsx`'s call.
- [x] 4.2 `post-choice.test.ts`:
  - `openPostOf`: `addedPost: "wishlist"` with posts `[{slug:"doubles",want:"hunting"},{slug:"spares",want:"wishlist"}]` → `"spares"`; the existing WTB-lead test still gives `"doubles"`.
  - `startWantOf`:
    - Buy post `matchesPost: "lookingfor"` in `wantLists` → `"lookingfor"`;
    - `target` only → it;
    - a paired want `"hunting"` → undefined;
    - a slug not in `wantLists` → undefined;
    - `addedWant` beats `target`.
  - `offerOnOf`, one test per design row 1 to 8. Include: a start ignored once `newAsk`; a counter ignoring a start; "extras" (`want: null`) with and without an ask → `"none"` and `{ post: "extras" }`.
  - `giveRule`: off → null; `"none"` → `"none"`; `"every"` with and without `wantsOnTrade`. Rewrite the two tests named "…takes anything" (lines 87 and 95) to the new rule: a post without a want list → `"none"`; every want list with none on Trade → null.

  Verify: `cd apps/web && bun run paraglide:compile && bun test src/features/offers/builder/post-choice.test.ts`. The section's full check runs after 5.4, since `form.tsx` calls the changed `giveRule`: `bun run lint --filter=web && bun run typecheck --filter=web && bun run test --filter=web && bun run build --filter=web`.

## 5. Web: builder, copy

- [x] 5.1 Messages, `apps/web/messages/{en,ko,ja}.json`, add after `offer_rule_wanted_only`:
  - en `"offer_rule_wanted_none": "{post} has no want list, so {name} takes no objekts on it. You can offer a top-up."`
  - ko `"offer_rule_wanted_none": "{post} 게시물에는 원하는 목록이 없어 {name}님은 이 게시물로 오브젝트를 받지 않습니다. 추가 금액은 제안할 수 있습니다."`
  - ja `"offer_rule_wanted_none": "投稿「{post}」には希望リストがないため、{name}さんはこの投稿でオブジェクトを受け取りません。上乗せはオファーできます。"`

  Verify: `cd apps/web && bun run paraglide:compile` succeeds.
- [x] 5.2 Replace `auth_account_only_wanted_desc` (line 478) in each file with:
  - en: `"People can give you only what you want. An offer on one of your posts can give only objekts on that post's want list. On a post without one, it can give no objekts. An offer started from your Buy post can give only objekts on its want list. Any other offer can give only objekts on your want lists on Trade. Cash-only offers, and objekts you asked for in a counter, still come through."`
  - ko: `"원하는 것만 받을 수 있습니다. 내 게시물에 대한 제안은 그 게시물의 원하는 목록에 있는 오브젝트만 줄 수 있습니다. 원하는 목록이 없는 게시물에는 오브젝트를 줄 수 없습니다. 내 구매 게시물에서 시작한 제안은 그 원하는 목록에 있는 오브젝트만 줄 수 있습니다. 그 밖의 제안은 거래에 올린 내 원하는 목록에 있는 오브젝트만 줄 수 있습니다. 현금만 담긴 제안과 역제안에서 내가 요청한 오브젝트는 그대로 받습니다."`
  - ja: `"希望するものだけを受け取れます。あなたの投稿へのオファーは、その投稿の希望リストにあるオブジェクトだけを出せます。希望リストのない投稿には、オブジェクトを出せません。あなたの購入の投稿から始めたオファーは、その希望リストにあるオブジェクトだけを出せます。それ以外のオファーは、取引に出しているあなたの希望リストにあるオブジェクトだけを出せます。現金だけのオファーと、対案であなたが求めたオブジェクトはそのまま届きます。"`

  Verify: `cd apps/web && bun run paraglide:compile` succeeds, and each locale has six sentences in the same order.
- [x] 5.3 `apps/web/src/features/offers/builder/types.ts`: add `wantSlug: string | null` to `AddedMatches`, documented "the want list You give's matches came from, when You give won". `offer-builder.tsx` (`added={…}`, near line 134) passes `wantSlug: data.wantSlug ?? null`. Fix `builder/matches.test.ts`'s fixture with `wantSlug: null`. Verify: `bun run typecheck --filter=web` (after 5.4).
- [x] 5.4 `apps/web/src/features/offers/builder/form.tsx` `BuilderForm`:
  - `openPostOf` gets `addedPost: added?.postSlug ?? added?.wantSlug`.
  - After `postSlug`, add:
    ```ts
    const wantLists = theirs.data?.wantLists ?? [];
    const newAsk = getShown.some((pick) => !pick.kept);
    const startWant = startWantOf(posts, wantLists, {
      matchesPost: request.matches?.post,
      addedWant: added?.wantSlug,
      target: "target" in to && to.target.kind === "list" ? to.target.slug : undefined,
    });
    const offerOn = offerOnOf({ postSlug, posts, startWant, newAsk, counter: request.counter !== undefined });
    const gives = giveRule(rules, offerOn.gives);
    ```
    Replace the current `gives` line and its comment. Move `getShown` above it if needed.
  - `ruleLine("give")`:
    - `null` → null;
    - `"all"` → `offer_rule_wanted_only({ name })`;
    - `"none"` → `offer_rule_wanted_none({ name, post: postName ?? postSlug! })`;
    - `{ want }` → `offer_rule_wanted_post({ name, post })`, where `post` is, for a start (`typeof offerOn.gives === "object" && offerOn.gives.start`), `wantLists.find((w) => w.slug === gives.want)?.name ?? gives.want`, else `postName ?? postSlug!`.
  - `send`: replace `...(postSlug !== null && { post: postSlug })` with `...offerOn.input`.
  - `SideColumn` `closed`: `side === "get" ? <today's expression> : gives === "none"`.
  - The picker's `rules`: `wantedOnly: gives !== null && gives !== "none"`, and `wantList` only when `gives` is an object.
  - `apps/web/src/features/offers/offer-picker.tsx` `PickerRules.wantList` doc ("the post's own want list…") becomes: "the one want list You give's picker keeps to under `wantedOnly`: the post's, or the Buy post the offer started from".

  Verify: `bun run lint --filter=web && bun run typecheck --filter=web && bun run test --filter=web && bun run build --filter=web`.

## 6. Docs and changelog

- [x] 6.1 `apps/web/src/components/layout/changelog-entries.ts`: replace the uncommitted line with `"With Only offers with what I want on, what you give must be on one want list even when you ask for nothing: the Buy post you started from, else the post your offer is on. A post without a want list takes only a top-up."`. It stays English. Verify: `bun run typecheck --filter=web`.
- [x] 6.2 `apps/web/docs/offers.md`, Offer builder paragraph: replace the `giveRule` parenthesis with:
  - `offerOnOf` (`builder/post-choice.ts`) picks what You give keeps to, by design.md Decision 1: the start (`startWantOf`: `matches.post`, `added.wantSlug` or `to`, when it is in `wantLists` and pairs with no post) while You get holds no new ask; else the Offer on post's want list; every want list for a counter asking nothing new or a partner with no posts.
  - A post without a want list hides You give's Add (`offer_rule_wanted_none`).
  - `offerOn.input` sends `post` and `wantList`.
  - `openPostOf` maps a paired want list to its post.
- [x] 6.3 `packages/api/docs/offers.md`, The recipient's offer rules: rewrite the `not_wanted` bullet and the `post_list_id` bullet from the current diff to `givesRuleOf`'s table:
  - one list per offer (`postWantedAmong`, or `wantListWantedAmong` for a `wantList` start resolved by `resolveWantList`);
  - a post without a want list takes no objekts;
  - every want list (`wantedAmong`) only for a partner with no lists, a counter asking nothing new, and a request naming no post;
  - stored: `stored`, null in those cases and for a `wantList` start.

  Under Suggested offers, add that You give is cut to one want list (`oneWantOf`, `wantSlug`). Add that the whole theirs page carries `wantLists`.

  Verify: read each paragraph against the delta specs. Then `bun run format` and `bun run lint --filter=web && bun run typecheck --filter=web && bun run test --filter=web && bun run build --filter=web`.

## 7. Checks and browser

- [x] 7.1 From the root: `bun run check` and `bun run build --filter=web` pass. `git diff --stat` touches only the files named above.
- [x] 7.2 Read-only browser check. Use the dev server on port 3200 (`.env.local` keeps it on the local database). Follow the browser-use rules in `~/.claude/CLAUDE.md`:
  - use `browser-use`, not `agent-browser`;
  - open and drive your own tab by target id;
  - wait for hydration before any click.

  Sign in as localtest1. localtest2 has `only_wanted_offers` on, with:
  - `lt2spares` ↔ "lt2 wants spares";
  - `lt2extras` ↔ "lt2 wants extras";
  - `lt2sale` with no want list;
  - the Buy post `lt2wants`.

  **Never click Send.** Checks:
  - (a) `/trade/@0x10ca1e5700000000000000000000000000000002/offer`: the You give line names Offer on's post. You give's picker shows only that post's want list. Switching Offer on to the other paired post switches both.
  - (b) Offer on `lt2sale`: You give has no Add button. The line reads "lt2sale has no want list, so … takes no objekts on it. You can offer a top-up."
  - (c) `/trade/@0x10ca1e5700000000000000000000000000000002/offer?to=lt2wants`: the line names lt2wants' want list, and You give's picker shows only its collections. Switching Offer on with You get empty changes nothing on You give. Adding one You get pick switches the line and picker to Offer on's want list. Removing it switches back.
  - (d) If localtest2 has an open offer to localtest1, Counter it with You get untouched: the line reads "their want lists".
  - (e) If a Trade row exists with only You give matches across two of localtest2's want lists: only one list's matches are added. The fixtures may not reproduce this; if not, say so.

  Report each check as passed, failed or not reproducible. Close your tab. No code changes in this task; `bun run check` from 7.1 still stands.

## 8. AGENTS.md

- [x] 8.1 No package's conventions, traps or workflow change: the rules live in `apps/web/docs/offers.md` and `packages/api/docs/offers.md`, which `apps/web/AGENTS.md` and `packages/api/AGENTS.md` already point to. State that in the summary. Verify: `git diff --stat -- '*AGENTS.md'` is empty, and `bun run check && bun run build --filter=web` pass.

## Workflow follow-up

- Archive `offer-one-post-only` before this change: both modify the same `web-trade-offers` requirements and `web-account` Offer rules.
- Commit and deploy only with the owner's approval.

## Review fixes (2026-11-16)

Task 3.3's `oneWantOf`/`onePostOf` and `filled.get` were replaced after the final review:

- [x] R.1 `suggestOffer` cuts both sides from the uncut matches (`getAll`, `giveAll`), reads the partner's lists in its first `Promise.all`, and chooses with the pure `oneListOf` (`lib/offer-recipient-rules.ts`, tested). Verify: `bun test` in `packages/api`.
- [x] R.2 `startWantOf`: `matches.post`, else `added.wantSlug`, else `to` decides alone; a paired one is no start (test "a paired added want is no start, whatever the target").
- [x] R.3 `resolveWantList` refuses a want list paired with a post (`NOT EXISTS` on `trade_post.want_list_id`).
- [x] R.4 `bun run check` and `bun run build --filter=web` pass.
