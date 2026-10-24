# Design

## Context

A post is derived, not stored: `postsCte` (`services/trade-feed/query.ts`) and `pairPosts` (`lib/trade-feed.ts`) build one post per list on Trade (`discoverable`), folding a want list into the have list that links to it. A link is written on both rows (`list.update` in `routers/list-crud.ts` sets `linked_list_id` on each side and clears any older partner). Open to is `match_have` and `match_sale` on the want list, decoded once by `openToOf` (`schemas/open-to.ts`). `trade.setShowOnTrade` flips one list through `tradeColumns(on)`, which also sets the bump time. `list.update` requires `linkedListId` and `discoverable`; `matchSale` and `matchHave` are already optional.

## Goals / Non-Goals

**Goals:**
- One write per post that saves its lists, link, Open to and Trade state together.
- One tag rule, in TypeScript and SQL, that both Browse and Your posts read.

**Non-Goals:**
- No `trade_post` table, no migration, no change to `candidates.ts`, `recount` or the ranking.

## Decisions

### A post is still its lists
The composer writes the columns the feed already reads, so every existing list maps to one post kind with no backfill: a sale list on Trade is Sell; a want list on Trade with `match_have` off is Buy; anything else on Trade with a have or want list is Swap, and "also pay" is the want list's `match_sale`. A `trade_post` table was considered and rejected: it would duplicate `discoverable` and the link, and matching would have to read both until the old columns went.

### `trade.savePost` and `trade.takeDownPost`
`trade.savePost({ kind, have?, want?, sale?, alsoPay?, unpair?, replaces? })` runs in one transaction:
- checks ownership and the list types, the profile binding through `resolveDiscoverable`, and that no picked list is in another post on Trade (`replaces` names the post being edited, by its anchor slug, so its own lists pass);
- a picked list paired outside the post is refused with `trade_post_list_paired` unless `unpair` is set, in which case the old link is cleared on both rows;
- writes the link on both rows for a Swap pair, `match_have`/`match_sale` through `flagsOf` (Swap: `swaps` or `both`; Buy: `buying`), and `tradeColumns(true)` on each picked list;
- for an edit, takes lists dropped from the post off Trade with `tradeColumns(false)`; a dropped list is unlinked only from a half that stays in the post, so a pair dropped whole keeps its link, as `trade.takeDownPost` does;
- ends with `touchList` for every changed id, as `list.update` does, so the trade version and caches move; a save that touches a sale list moves the market version, so `trade.savePost` and `trade.takeDownPost` share a per-user write limit.

`trade.takeDownPost({ slug })` sets `tradeColumns(false)` on the post's lists and keeps the link. Both refuse through `refuse()` with codes from a new `TRADE_POST_REFUSALS` tuple in `schemas/trade.ts` (`trade_post_list_in_post`, `trade_post_list_paired`, `trade_post_needs_profile`, `trade_post_wrong_type`, `trade_post_empty`), each with an `api_errors_*` string in `en`, `ko` and `ja`. Reusing `list.update` twice per post was rejected: the two writes are not atomic, and the pair rule (`checkLinkedList`) would refuse the intermediate state. `trade.setShowOnTrade` stays for open tabs and for the sale list switch.

The composer's choices and tags come from a pure module beside `open-to.ts` in `schemas/` (the web imports it): `postKindOf(lists)` reads an existing post as `{ kind, alsoPay }`, `tagsOf(post)` returns the tag set, and `composerWrites(choice)` returns the flags and Trade state per list. The server validates with the same functions, and they are tested there.

### Tags as a set
`postTag` becomes `postTags` with the rule in `web-trade-browse` (WTT for a have list or a want list open to swaps; WTB when the post's want list is open to buying; WTS for a sale list). `postsCte` exposes the partner's `match_sale` and `match_have` so `TAG_WHERE` can read a pair's want side; `wtb` becomes "a want list on its own with `match_sale`, or a have list whose partner has `match_sale`", and `wtt` becomes "a have list, or a want list on its own with `match_have`". Feed posts and `trade.myPosts` keep `tag` (the first tag) for open tabs and add `tags`; chat post cards keep `tag` only. Mutual's WTT filter reads `TAG_WHERE.wtt`, so a want list on its own open to swaps or buying joins Mutual, which changes the Mutual set: `trade:mutual-people`, `trade:mutual-count`, `trade:people-order` and `trade:feed-scope` bump their key versions.

### `list.update` from the new form
`linkedListId` and `discoverable` become optional in `editListInputSchema`, and an omitted value keeps the list's current one, as `matchSale` and `matchHave` already do. Open tabs keep sending both and get today's behaviour, including "linking turns the partner on". The new list form sends neither for a have or want list, and sends `discoverable` only for a sale list's switch.

### Web
- `post-list-dialog.tsx` becomes the composer, reusing `Dialog`, the vendored `RadioGroup` for the kind and list choices, and `ListRoleBadge`; its state is local `useState`, no store. Opened from an entry point (Your posts, a Trade line, Edit post) it starts on that post's kind and lists.
- `my-posts.tsx` reads `tags`, `kind`, lists by role and the option from `trade.myPosts`, adds New post to its header and the row menu (Base UI `Menu`, already vendored), and renders its empty state instead of nothing. `browse-view.tsx` keeps its top button, as New post, only where the row doesn't show: For you and signed-out visitors.
- `list-form.tsx` drops the Show on Trade switch, Open to and the link picker for have and want lists and renders the Trade line from the list's post, read from the viewer's own lists (`trade.myPosts` holds only lists on Trade); a sale list's relabelled switch saves through `list.update`, and `trade.setShowOnTrade` stays for open tabs.
- `matching-controls.tsx` renders one `Button` with `aria-pressed` after Compare with and before `MatchHelp`, replacing both `MutualSwitch` copies.
- The Buying only and Swaps only notes leave the trade card; the tag chip renders `tags`.

## Risks / Trade-offs

- [The Mutual set grows by want-only posts open to swaps or buying] → They already counted toward Mutual through matching; only their WTT listing is new. Key version bumps keep caches from mixing old and new sets.
- [An older tab edits a list the composer manages] → It writes the same columns through `list.update`, so the next composer read shows the result; nothing it can save is invalid for a post.
- [A pair whose want list is Buying only, saved before the pair rule] → `postKindOf` reads it as Swap with "also pay" and no swaps; Edit post shows it as Swap with also pay ticked, and saving writes Swaps or buying. Count these on production read-only before deploy, as `want-buying-only-unpaired` task 3.2 already plans.

## Migration Plan

No schema change. Deploy API and web together; open tabs keep working through `tag`, `trade.setShowOnTrade` and `list.update`. Rollback is a redeploy: the columns mean what they meant before.
