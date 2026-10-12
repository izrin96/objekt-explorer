## Context

See proposal.md for why. This builds on change 1 (`trade-person-level-matches`), whose code is in the working tree: `mutualOf` / `countsFit` in `schemas/trade.ts`, `personMatches` in `services/trade-matches/person.ts` over `recountPartners`, posts carrying `person`, and the worded `MatchChip`.

Current state that shapes the approach:

**The Browse feed** (`services/trade-feed/index.ts`, `query.ts`) pages newest bump first.
- The cursor is `{ bumpedAt, id }`.
- Only matches is `matches: boolean`. When it is on, stage 1 adds `matchesIndex(viewer)`, and stage 2 drops posts that fail `matchesViewer`.
- The `Viewer` index (`fetchViewer`) always covers all of the viewer's lists. It maps each slug to list ids, and `narrow()` in `viewer.ts` already filters such a map.

**For you** is `getTradeMatches(userId, sides, filter)`.
- Its result is cached for 5 minutes at `trade:foryou:2:${user}:${version}:${market}:${filter}:${listId|all}`.
- It holds at most 50 ranked partners, with idle partners last, each carrying `counts`, `updatedAt` and `idle`.
- `resolveTradeSides(user, slug, filter)` turns a Compare with slug into sides: the list plus its pair (`pickedSides`), or all lists.

**The callers:**
- `tabCounts` (`services/trade-tabs.ts`) returns `{ forYou, mine }` behind a strict `.output()`. `forYou` is the length of the `all` result.
- `listMatchCount` reads the same cache with `fullestFilter`.

**The web side:**
- The `/trade` loader builds `browseOptions(toBrowseInput(...))` before it awaits `currentUser`, and the view gets `canMatch` from `currentUser.lists`.
- `useHidePartner` optimistically edits the `trade.forYou` cache.
- `/trade/for-you` has `beforeLoad: requireSignedIn`.

**`trade-active-hours`** is planned but not applied. It puts an Active now switch beside Only matches and a mark in the For you row byline.

## Goals / Non-Goals

**Goals:**
- One feed answers both questions.
- Old tabs and links keep working.
- Mutual reads the mutual rule of decision 15 (the smaller of the two one-way counts), without For you's 50-person slice or idle tier.
- Compare with narrows the chips, the rings, Any and Mutual in one place.

**Non-Goals:**
- Caching Browse's per-page person pass, which is still uncached as in change 1.
- Removing `trade.forYou` or `listMatchCount`.
- New database indexes.

## Decisions

1. **Browse takes a mode, derived for old tabs.**
   - `browseInputSchema` gains three optional fields:
     - `match: z.enum(["off", "any", "mutual"])`;
     - `list: z.string().min(1)`;
     - `cursor.rank`, an object with `mutual`, `sum`, `at` and `userId` (decision 4).
   - A pure `browseMode({ match, matches })` in `lib/trade-feed.ts` returns `match ?? (matches ? "any" : "off")`, so the server default stays Off.
   - The web resolves the viewer's Any default itself and always sends `match` (decision 7). Sending `matches` stops.
   - *Alternative:* a server default of Any. Rejected: an open tab with Only matches off sends no `matches`, and must keep getting every post.

2. **Compare with narrows the viewer once.**
   - While the mode isn't Off, `browseFeed` resolves `resolveTradeSides(viewer, list, "all")`.
   - It narrows the `Viewer` with a pure `narrowViewer(viewer, sides)` in `lib/trade-feed.ts`, which moves `narrow()` there and keeps only the sides' list ids in `have`, `want`, `tradeHave` and `saleWant`.
   - Stage 1's `matchesIndex`, stage 2's `assemblePost` (the rings and narrowing) and `personMatches(viewerId, ownerIds, sides)`, whose new parameter defaults to all lists, all read the narrowed sides. So chips, rings and the per-post test can't disagree.
   - Under Mutual, a list whose sides lack one direction reads as all lists. The web disables that case already, and the server falls back the same way.
   - Tests in `trade-feed.test.ts`:
     - a pair keeps both directions;
     - a lone have list empties `want`;
     - a sale list keeps only its own `have` entries.
   - *Alternative:* re-read the viewer index per list. It would be a second cached index per list, for the same data.

3. **Mutual reads its own cached people list.**
   - The people come from `getMutualPeople(viewer, sides)` (`services/trade-matches/mutual.ts`), which runs `recountPartners(…, "mutual")` and keeps the light `{ userId, updatedAt, counts }` rows, cached for 5 minutes at `trade:mutual-people:2:…`. It does not read `getTradeMatches`, whose 50-person slice comes after the idle tier, so an idle person could hold a place an active one lost. The mutual rule is decision 15's.
   - The set is bounded by the candidate query's `CANDIDATE_LIMIT` (200, ranked in SQL by the mutual score), not by `PARTNER_LIMIT`. The 50-person cap stays on `trade.forYou`, for open tabs.
   - A pure `mutualPeople(partners)` in `lib/trade-rank.ts` keeps the mutual ones and orders them with `mutualOrder`: mutual, then sum, then `updatedAt`, then `userId`, with no idle tier. Idle posts are excluded by `listedPost` anyway.
   - Stage 1 gains an owner mode: `posts.user_id = ANY($ids)`, the usual `matchesIndex`, and `ORDER BY array_position($ids, posts.user_id), bumped_at DESC, id DESC`.
   - Stage 2 is unchanged.
   - *Alternative:* rank posts in SQL from the candidate query. That would redo the ownership check that only `recountPartners` does.

4. **The Mutual cursor is a keyset on the person, not an offset.**
   - The cursor is `{ bumpedAt, id, rank: { mutual, sum, at, userId } }` from the last post.
   - A pure `peopleAfter(ordered, rank)` (tested) returns the cursor's person followed by everyone who sorts after that tuple. SQL adds `(posts.user_id <> $first OR (posts.bumped_at, posts.id) < ($bumpedAt, $id))` only when the cursor's person is first in the list (`resume`); when that person dropped out of the ranking, no bump filter applies, since everyone listed is still unseen (`cursorScope`, tested).
   - When the 5-minute cache rolls over between pages, people keep their places unless their own counts changed. The web dedupes posts by `id` when it flattens pages, so a moved person can't show twice.
   - *Alternative:* an offset into the ranked list. It skips or repeats whole people whenever anyone above them changes.
   - *Alternative:* all Mutual posts in one page. That assembles up to 200 people's posts at once, which is heavier than the 24-post pages the feed is tuned for.

5. **Mutual N is its own small procedure.**
   - `trade.mutualCount({ list? })` (authed) counts the distinct owners among the Mutual people who have at least one post passing the stage-1 predicates: listed, not sanctioned, not hidden or blocked, `matchesIndex`. It shares a `feedWhere` with `fetchFeedRows`.
   - It deliberately ignores Type, the artist selection and the collection facets, as the old tab badge did. Taking them would cost an indexer slug resolve per call, and N would jump with every filter. The spec says N stays put while the viewer filters.
   - It is cached for 60 s on viewer version, market version and list, and reads `getMutualPeople`.
   - The list header's Find matches count reads it too, with that list, so the header and the "Mutual N" it opens on can never disagree (decision 12).
   - `tabCounts` keeps its strict output and gains an optional input `forYou: boolean` (default `true`). A tab sent before the deploy sends `{}` and gets For you's "all" partner count as before, so its For you tab stays correct. The current web sends `{ forYou: false }`, gets `forYou: 0` and skips For you's pipeline, since only `mine` is read.
   - *Alternative:* `forYou.partners.length` under Mutual. It counts people whose posts are all idle, so N would promise people Mutual doesn't list.

6. **The person sheet gets its own owner-scoped read.**
   - `trade.person({ userId, list? })` (authed) returns `{ partner | null, collections, checkedAt }`.
   - `computeTradeMatches` splits its hydration (users, partner lists, collections, identity) into `hydratePartners(ranked, addressRows, now)`.
   - `personDetail` runs `recountPartners(viewer, sides, "all", [userId])`, then `rankPartners(…, "all")`, `hydratePartners`, `withMessageable` and `withReputation`.
   - It is cached for 60 s on viewer version, market version, list and person.
   - Hidden, blocked and sanctioned people fall out of the candidate SQL, so `partner` is `null`, and the sheet says only "no matches".
   - With no match the result also carries `header`: the account's `user`, `identity` (its name), `reputation` and `userId`, read straight from the account, so the sheet's title and header work for a person the viewer hid, or whose lists left Trade, and for a URL opened cold. It is `null` for an account either side has blocked or that has a trade sanction, so a block never reveals a name; the sheet then uses the generic title.
   - *Alternative:* read the person from For you's cache. An owner past the 50 cap would open an empty sheet. Change 1 rejected the same lookup for chips.

7. **URL and loader on the web.**
   - `browseSearchSchema` gains `match`, `list` and `person`. Each is `.optional().catch(undefined)`, and `matches` is kept.
   - Pure helpers in `browse-search.ts`, tested in `browse-search.test.ts`:
     - `canMatchOf(lists)`, the predicate the view uses today;
     - `matchModeOf(search, canMatch)`: Off without `canMatch`; otherwise `match`; else Any for `matches=1`; else Off on a `slug` link; else Any;
     - `toBrowseInput(search, artists, selected, canMatch)`, which emits `match` and, unless the mode is Off, `list`.
   - The loader awaits `currentUser` before it builds the browse options, so SSR and the client share one query key.
   - Changing the mode writes `match` explicitly and drops `matches`.
   - Opening the sheet pushes `person` without `replace`, so Back closes it. Closing it navigates back when the sheet pushed the entry, and otherwise removes the parameter with `replace`.
   - `person` is left out of the route's `loaderDeps`, and both open and close navigate with `resetScroll: false`. Otherwise every open would re-run the loader and scroll the feed to the top behind the sheet.

8. **`/trade/for-you` is a redirect route.**
   - The route keeps `validateSearch: forYouSearchSchema`, moved into `browse-search.ts`. `beforeLoad` throws `redirect({ to: "/trade", search: forYouToBrowse(search), replace: true })`.
   - `requireSignedIn` goes, since Browse handles signed-out visitors.
   - `forYouToBrowse` is pure and tested: `mutual` stays Mutual, and everything else becomes Any; `list` is kept; `partner` becomes `person`.
   - `for-you-view.tsx`, `for-you-results.tsx`, `partner-row.tsx` and `search-schema.ts` are removed.
   - `for-you-compare.ts` becomes `compare-with.ts`. It keeps `COMPARE.both`, `ALL_LISTS`, `TradeList` and the pick helpers. The one-way kinds and `MATCHES`/`SIDE` go.

9. **The controls reuse what Browse and For you already have.**
   - Matches is a `Tabs` strip like the Type tabs beside it, so the row reads as one kind of control and inherits `data-scroll-x` overflow handling. "Mutual N" uses the tab-count markup from `trade-tabs.tsx`, with `MonoMessage`-style mono digits and the count in the accessible name.
     - *Alternative:* `ToggleGroup`. It has the better radio semantics, but it would be the page's only one.
   - Compare with is For you's `SingleSelect` with its `disabled` options. The compared-lists line and `MatchHelp`, whose `browse` lines now include `trade_match_help_compare`, carry over.
   - Below `md`, a `Sheet` (`side="bottom"`) opens from a Matching button, following `FilterSheet`'s trigger pattern. The inline controls are hidden there.
   - A new `matching-controls.tsx` holds both layouts and the three-way prompt from change 1.

10. **The person sheet is built from the Trade card parts.**
    - `person-sheet.tsx` uses `Sheet`: `side="right"` from `md`, and `side="bottom"` below it.
    - Inside it:
      - `TradeHeader`;
      - `MatchChip` with `MatchedLists`;
      - captioned columns built from `SlugTile`/`TILE` (`thumb-grid.tsx`);
      - struck not-counted tiles;
      - a plain list of the person's matched lists, with the same items as `ListsPopover`;
      - `TradeActions`, using `PartnerRow`'s contact and `bestCard` logic, moved here;
      - `SafetyMenu` with a Hide item.
    - It reads `trade.person` through a `personOptions(userId, list)` query and opens the `ObjektDrawer` already in `browse-view.tsx`.
    - The post's "See in For you" becomes an All matches button. It shows whenever `post.person` is set, and it replaces the `forYouMutual` prop and the `forYouOptions("mutual")` read in `browse-view.tsx`.

11. **Hiding moves its optimistic target.**
    - `useHidePartner` cancels the `orpc.trade.browse.key()` queries and filters the hidden user's posts out of every cached page with `setQueriesData`. It then invalidates `trade.key()` as today.
    - `BrowsePost` passes a Hide `MenuItem` to `SafetyMenu` as `extraItems`, with the same undo toast as `for-you-results.tsx`.
    - The footer note's link becomes a button opening `HiddenPartnersDialog`. `/account/hidden` stays.

12. **The callers become Browse links.**
    - `notification-items.tsx`: `to="/trade"` with `{ match: "any", list }`.
    - `list-header.tsx`: `{ match: fullestFilter(...) === "mutual" ? "mutual" : "any", list: slug }`.
      - A list that compares both ways shows `trade.mutualCount({ list: slug })`, the number the Mutual option reads on arrival, so idle-only people are left out the same way.
      - A lone list opens on Any, which carries no number, so its Find matches control shows no count.
      - `listMatchCount` stays in the API for open tabs, and the header stops calling it.
    - `user-menu.tsx`: `/trade` with `{ match: "mutual" }`, labelled `trade_matches_menu` ("Trade matches").
    - `trade-tabs.tsx`: the For you item goes, and `tabCountsOptions` stays for `mine`.

13. **Messages (en, ja, ko).**
    - Add:
      - `trade_matches_label`, `trade_matches_off`, `trade_matches_any`, `trade_matches_mutual` and `trade_matches_mutual_count`;
      - `trade_matching_button` (with the option and list);
      - `trade_all_matches`;
      - `trade_person_no_matches`;
      - `trade_browse_no_mutual_title`, `trade_browse_no_mutual_hint` and `trade_browse_show_any`;
      - `trade_matches_menu`;
      - `trade_browse_help_matches`, replacing `trade_browse_help_only_matches`.
    - Reword `trade_hide_partner` to "Hide", and reword every other user-facing string that still names For you, so none says "For you" any more: `trade_hidden_partners_description`, `list_create_on_trade_desc`, `list_create_on_market_desc`, `chat_empty_inbox_hint`, `chat_settings_allow_anyone_desc`, `mod_block_description`, `mod_blocked_empty_hint`, `notification_sanction_trade_block`, `mod_blocked_desc`, `mod_action_trade_block_hint` and `offer_mine_empty_hint`. A "For you match" or "row" becomes "Trade post" or "match".
    - The `web-moderation`, `web-chat` and `web-cosmo-link` specs get the same wording through MODIFIED requirements in this change (Block a user, Sanctions, Message attaches its card, Hide Cosmo ID).
    - Remove, if knip confirms nothing else uses them:
      - `trade_only_matches`, `trade_tab_for_you`, `page_titles_trade_for_you`, `trade_for_you_description`;
      - `trade_filter_they_have`, `trade_filter_they_want`, `trade_show_everyone`;
      - `trade_list_all_have`, `trade_list_all_want`;
      - `trade_compare_all_have`, `trade_compare_all_want`, `trade_compare_have_only`, `trade_compare_want_only`;
      - `trade_match_help_show`, `trade_match_help_title`;
      - `trade_browse_mutual_link`, `trade_partner_count`, `trade_show_all`;
      - the `trade_not_shown_*` messages.

14. **What an open tab sends after the deploy**, and why it still validates:

    | Old call | Input it sends | After the deploy |
    | --- | --- | --- |
    | `trade.browse` | facets, `type`, `slug`, `matches?: true`, cursor `{ bumpedAt, id }` | Validates: the new fields are optional and `cursor.rank` is optional. `browseMode` gives Off or Any, which is today's Only matches with all lists. The output only gains optional `nextCursor.rank` under Mutual, which an old tab never asks for. |
    | `trade.forYou` | `{ filter, list? }` | Unchanged. An old bundle's client-side For you route keeps rendering it until reload. |
    | `trade.tabCounts` | `{}` | Validates (`forYou` defaults to `true`) and returns For you's partner count as before. |
    | `trade.listMatchCount` | `{ slug }` | Unchanged. |
    | `trade.hidePartner`, `trade.unhidePartner`, `trade.hiddenPartners` | unchanged | Unchanged. |

    `trade.person` and `trade.mutualCount` are new, so no old tab calls them.

15. **Mutual counts sale lists that buying can answer; "trades only" becomes "swaps only".**
    - The one-way counts already follow the rule, so Mutual is `Math.min(theyHave, youHave)`:
      - *They have:* `candidates.ts` joins a partner's sale list to my want slug through `offerMatchesWantSql` (a sale list matches only when `my_want.match_sale`, the `bool_or` over my want lists holding the slug), and `recount` marks the match.
      - *You have:* a partner's want list takes my have lists always and my sale lists only when its own `match_sale` is true (`p.match_sale OR h.on_have` in SQL, `myHaves.all` against `myHaves.trade` in `recount`).
      - The viewer-side indexes (`saleWant`, `tradeHave`) in `lib/trade-feed.ts` apply the same gate.
    - `MatchCounts` keeps `tradeTheyHave` and `tradeYouHave` in the output that open tabs may read, now unused by `mutualOf`. `matchCounts` still fills them. The SQL prefilter for Mutual and the ordering in `candidates.ts` stop reading the trade-only counts (`a_t`, `b_t`).
    - The cache keys bump to `trade:foryou:4:`, `trade:mutual-people:2:`, `trade:mutual-count:2:` and `trade:person:3:`, since the cached counts and Mutual membership change, and a match's `myListIds` now names only the viewer's want lists open to buying when the match came through a partner's sale list (all of them for a have list). In the other direction `myListIds` already names only the have or sale lists that answer the partner's want list.
    - Vocabulary: **Trade** is the umbrella (swap, buy or sell); **swap** is objekt for objekt with no money; **buy** and **sell** are paid in real currencies, never COMO. User-facing "trade(s)" that meant swap only becomes "swap(s)": `trade_wtt_trades_only` (renamed `trade_wtt_swaps_only`), `list_create_match_trades_*`, `list_create_match_sales_label`, the browse help rows, `notification_pref_want_match_desc` and `trade_match_help_mutual`. The other message keys keep their names. WTT, WTB and WTS stay, and so does "Trade" in the page, My trades and Make offer.
    - Japanese follows Korean (거래 / 교환): **取引** is the Trade umbrella (page, nav, My trades, a trade in progress, offers, moderation, notifications; 取引 also covers buying, unlike 交換), and **交換** is swap only (WTT, 交換のみ, 交換または購入, the chat suggestions). Notification and chat strings that said トレード use 取引.
    - *Alternative:* keep Mutual on trades only and add a separate "sale-assisted" count. Rejected: a person who can buy what you want and wants what you sell is a real counterpart, and a second count would split one ranking.

## Risks / Trade-offs

- [Any is the default, so a signed-in viewer's feed is narrowed on first load ("HAVE 3 of 27")] → It is today's Only matches behaviour, chosen as the default. Off is one tap away and sticks in the URL. Check first-run readability in the browser task.
- [Mutual reads a 5-minute cache while chips are fresh] → A chip can turn mutual before its owner joins Mutual. The Freshness spec allows it, and the person sheet's 60 s read sits between the two.
- [`mutualCount` adds a cached count query] → It is cached for 60 s and bounded to at most 200 owner ids.
- [When the person tuple shifts between pages, a person can move] → The web dedupes posts by `id`. A person whose counts change mid-scroll may land earlier or later, never twice.
- [`trade-active-hours` targets Only matches and the For you row] → When it is applied, its Active now switch sits beside Matches, and its mark goes in the person sheet header. Its tasks need that note before apply.
- [Losing For you's "Not shown" totals] → Per-person struck objekts sit in the sheet, hidden people are reached from the footer note, and blocked people from Account › Blocked.

## Migration Plan

Archive change 1 first, since this change's MODIFIED blocks are written against its text. Deploy `packages/api` and `apps/web` together, as one web image. There is no database change. Decision 15 changes what the cached counts mean, so `trade:foryou`, `trade:mutual-people`, `trade:mutual-count` and `trade:person` each take a new version and the old entries age out unread. To roll back, revert the commit. Old links into `/trade?match=…` then fall back to Browse's ignored-parameter behaviour, and `/trade/for-you` is a page again.

## Decisions on the open questions

- **Find matches count.** The header uses `trade.mutualCount({ list })`, so it matches the Mutual N it opens on; a lone list shows no count (decision 12).
- **Account menu.** Trade matches opens Mutual.
- **Hidden people.** The footer note opens the dialog in place.
- **Default narrowing.** Any narrows each post, as designed.
- **`slug` links** default to Off.
- **Idle mutual people** no longer show anywhere.
- **`trade-active-hours`** is left untouched. It targets Only matches and the For you row, so it must be updated after this change lands: its Active now switch goes beside Matches and its mark in the person sheet header.
