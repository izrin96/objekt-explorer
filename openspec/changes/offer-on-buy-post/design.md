# Design

## Context

- **Offer on today.** `BuilderForm` (`apps/web/src/features/offers/builder/form.tsx`) builds Offer on from `theirs.data.lists`, the partner's have and sale lists on Trade (`partnerListChoices`, `services/offer/picker/theirs.ts`). It draws a `SingleSelect` of `listOption`s for two or more, and the plain line `offer_on_post` for one.
- **Buy post starts.** A Buy post never enters that list. A start from one is tracked on the side: `startWantOf` (`builder/post-choice.ts`) keeps a want list from `theirs.data.wantLists` that no `lists[].want` names. `offerOnOf` then holds You give to it and sends `{ wantList }` while You get holds no new ask, whatever Offer on reads.
- **Server today.**
  - `createOffer` (`services/offer/index.ts:139-235`) resolves `wantList` through `resolveWantList` (`services/offer/core.ts:416-433`). That accepts a discoverable want list with an entry that is no `trade_post.want_list_id`.
  - `givesRuleOf` (`lib/offer-recipient-rules.ts:118-134`) holds gives to it and returns `stored: i.onPost`. That is null for a request with no `post` and no asks, so `offer.post_list_id` stays null and the card shows no "Offer on" line (`services/offer/view.ts:86,114,207`; `offer-body.tsx:117`).
- **Production.**
  - 196 want lists on Trade with entries lead their own row; none is in no row.
  - 4 are a row's `want_list_id` while that row's lead is off Trade. The browser counts those 4 as Buy posts (no on-Trade list pairs them) and `resolveWantList` does not.
  - Read-only, 2026-11-16.

## Server answers

- An offer naming `wantList` and no `post` that gives objekts, a top-up or both is accepted. Gives are checked against that want list only while the recipient's rule is on (`index.ts:236-252`). With the rule off nothing is checked.
- One that also asks (a You get pick that is not a kept objekt) is **not refused**. `givesRuleOf` takes the `newAsk` branch first (`offer-recipient-rules.ts:128-129`): `wantList` is ignored, gives are held to the asks' post, and the post one post per offer chose is stored (`index.ts:193-223`, `426`). The web never sends `wantList` together with asks.
- Stored today: `post_list_id = stored`, `post_id = min(trade_post.id) WHERE lead_list_id = stored` (`index.ts:426-431`). A gives-only `wantList` offer stores null for both.

## Decisions

### 1. Buy posts are Offer on choices, after the have and sale posts

The choices are `[...lists, ...buyPosts]`, each drawn by the existing `listOption`, so a Buy post shows the Want badge (`ListTypeBadge`) beside its name, as every list dropdown draws a want list. Have and sale posts come first, so the fallback where Offer on opens stays a have or sale post. A partner with one have post and one Buy post gets the select (two choices), which fixes calm. The line about another post (`offer_rule_one_post`) counts have and sale posts only, since a Buy post can't be asked from.

`SingleSelect` and `listOption` are reused unchanged. No new component.

### 2. What a Buy post choice does

- **Request.** `offerOnOf` returns `{ gives: { want: slug, buy: true }, input: { wantList: slug } }`, never `post`: `resolvePostList` resolves only have and sale lists and would quietly store nothing.
- **You give.** `giveRule` holds it to that want list when the rule is on; off, nothing is filtered. The rule line reads `offer_rule_wanted_post` with the Buy post's name.
- **You get.** `SideColumn`'s `closed` hides Add, and a new line `offer_rule_buy_post` says the offer asks for nothing and to change Offer on.
- **Picks already on You get.** They fail `postProblem` as `other_post` ("Not on {post}") and block Send, as a move between have posts does. They are not removed.
- **Picks counted as `newAsk`.** The Buy post branch still wins over them, so the line doesn't flicker while the blocked picks wait to be removed.

Rejected: keeping Add and flagging every pick. It invites picks that can never be sent.

### 3. Switching

- **Have post with picks → Buy post.** The picks are outlined "Not on {Buy post}" and Send is blocked. You give follows the Buy post.
- **Back to the have post.** The picks are valid again, and You give follows that post's want list (rule 1).

Both are `chosenPostOf` + `postProblem` as they work today. Nothing new.

### 4. Where Offer on opens

A Buy post opens Offer on only from a start that names it:
- `startList`;
- `matches.post`, set by the post's Make offer with matches and by a chat post card with a match;
- the added matches' `wantSlug`, a row's You give matches.

A row's `lead` (`to`) and a prefilled get pick never open on a Buy post, so row and person starts are unchanged ("From a WTB row" still opens on "doubles").

A Buy post's own Make offer without matches sends only `to`, the same request as a row whose lead post is that Buy post. To tell them apart, a post's own Make offer passes `startList: offering?.list.slug ?? anchor.list.slug`:
- `PostBlock`'s Make offer;
- on a post page, the row's Make offer (`person-row-view.tsx` → `TradeActions` → `MakeOfferButton`). Its comment already says it acts as that post's own Make offer does, so it gets a `startList` prop computed the same way while a post is focused.
- `listSlugsOf` dedupes it against `to`, so the loader's ownership check reads nothing new.
- The You get picker's `useListChoice` ignores a slug that isn't one of `lists`.

### 5. A Buy post start, then an ask

With the Buy post selected, You get has no Add, so the sender asks by changing Offer on to a have or sale post. The rule is then the same as any start: **Offer on alone decides You give's want list** for a partner with a have or sale post.
- `startWant` now matters only for a partner with no such post (decision 8).
- The old "start persists while Offer on reads another post" state goes away.

### 6. Counters unchanged

A counter offers no Buy post. A counter that asks nothing new is on no post and held to every want list (rule 2, ahead of `wantList` in `givesRuleOf`), so a Buy post choice would change nothing that is sent or stored. A counter that asks must be on a have or sale post.

### 7. A sent offer on a Buy post reads "Offer on {Buy post}"

`givesRuleOf`'s `wantList` branch returns `stored: i.onPost ?? i.wantList`.
- `post_list_id` becomes the want list.
- `post_id` resolves to its row through the existing subquery, since a Buy post's want list leads its row.
- The view joins `lists` by `post_list_id`, so the card and the offer page read its name with no change.
- A request naming both `post` and `wantList` (never the web's) keeps storing the post, as the existing test "a start with a post stores the post" pins.

This is needed for calm: with the rule off, a Buy post choice filters nothing, and without storage it would leave no trace once sent. The only reader of `post_list_id` is `fetchOffers`. `trade-post-drift`'s checks hold, since the row is led by `post_list_id`.

### 8. A partner whose only posts are Buy posts

They still get no Offer on choice: `onePost` is false, and You get draws on their collection or is closed.

While the offer started from a Buy post (`startWantOf`, as today) and asks nothing, the header reads the plain line "Offer on {Buy post}". That is what the request names and what the server now stores. An ask from their collection makes `offerOnOf` send `{}` (rule 1, no post), so the line goes, matching the stored null.

Rejected: passing `hasLists` into `givesRuleOf` so their Buy-post offers store nothing. That would keep a rule the builder can't show.

### 9. Classifying a Buy post: `wantLists[].buy`

`partnerListChoices` adds `buy` to each want list, computed with `resolveWantList`'s own predicate (`NOT EXISTS trade_post WHERE want_list_id = id`). The browser builds Buy posts and `startWantOf` from the flag instead of `lists[].want`.

That makes the 4 want lists paired with an off-Trade lead neither Offer on choices nor starts, which matches what the server accepts. Today the browser sends `wantList` for them and the server quietly ignores it. One predicate keeps the two sides from drifting.

## Risks

- **A row whose lead post is a Buy post, with the rule on.** Today it held You give to the Buy post (through `target`) while Offer on read "doubles". Now it holds to the post under Offer on. That follows decision 5 and the spec's wording, but it changes what such a row's offer may give.
- **Want lists paired with an off-Trade lead (4 on production).** The feed still shows each as a post of its own. Its Make offer opens on the first have or sale post, and Offer on doesn't offer it, since the server would not accept it as a Buy post.
