## Why

Browse and For you answer one question, "who can I trade with?", from two angles, and new users can't tell which tab to use. Change 1 (`trade-person-level-matches`) made both count a person alike; this change 2, archived after it, folds For you into Browse.

## What Changes

- **BREAKING:** the For you tab is removed. The tabs become Browse | My trades.
- **A Matches control (Off · Any · Mutual)** replaces the Only matches switch.
  - Any is today's Only matches.
  - Mutual keeps the posts of the people whose mutual score is above zero.
  - A signed-in viewer with a list that can match gets Any by default, so Off is explicit (`match=off`). An old `matches=1` reads as Any.
- **Ordering:** Any keeps newest-bump-first paging. Mutual ranks people best match first and groups each person's posts. There is no Sort control.
- **Compare with** moves onto Browse and shows only while Matches is on, with its help and its compared-lists line. The chips and rings follow it.
- For you's one-way views ("They have" / "They want") are dropped.
- **"Mutual N"** on the control replaces the For you tab badge.
- **A person sheet** (`person=<id>`) opens from a post, replacing "See in For you". It shows all of that person's matches with the viewer, as For you's open row did, with Message, Make offer, Hide, Block and Report.
- **Hiding someone** moves to each post's ⋯ menu and the sheet. The footer note opens Hidden people.
- **On phones**, Matches and Compare with sit behind one "Matching" button that opens a sheet.
- **`/trade/for-you` redirects into Browse** with matching on and its parameters mapped, so old notifications and open tabs keep working.
- **Its five callers move to Browse links:** notifications, the list header's Find matches, the account menu item (renamed "Trade matches"), the post link (now the sheet) and the tab.
- **Find matches count:** the list header's count is the Mutual N its link opens on (idle-only people left out); a list opening on Any shows no count.
- **Wording:** user-facing text that still says "For you" (chat, moderation, list and offer hints, notifications) is reworded, and the `web-moderation`, `web-chat` and `web-cosmo-link` specs follow.
- **Dropped from For you:** the "Not shown" totals and the page's "Ownership checked" line; the sheet and footer note carry their details.
- **Mutual counts sale lists that buying can answer.** Mutual becomes the smaller of the two one-way counts. A sale list counts toward a direction only against a want list open to buying; a want list open to swaps only never counts one. Before, Mutual counted have lists only.
- **"Trades only" becomes "swaps only".** Trade is the umbrella (swap, buy or sell); a swap is objekt for objekt with no money; buying and selling are paid in real currencies. The want-list setting reads "Swaps only" / "Swaps or buying", and the help rows, the WTT note and the Mutual help follow, in en, ja and ko. WTT, WTB and WTS stay.
- **Open tabs:** existing inputs still validate; new `trade.browse` inputs are optional.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`:
  - Filters, Matches to the signed-in viewer, Order and idle posts, Trade tabs, Trade card and Trade colours change;
  - a new Matches and Compare with requirement.
- `web-trade-for-you`:
  - narrowed to person-level matching, the person sheet and the old address;
  - its row, Filters and idle-rank requirements are removed.
- `web-shell`: the account menu item and the Trade active-link scenario.
- `web-lists`: the Find matches target and count; the want-list setting reads Swaps only / Swaps or buying.
- `web-moderation`, `web-chat`, `web-cosmo-link`: wording only, For you rows and matches become Trade posts and matches.
- `web-notifications`: the alert targets.

## Routes

- `/trade`: gains `match`, `list` and `person`.
- `/trade/for-you`: becomes a redirect.
- `/trade/mine`: unchanged.

## Non-goals

- A swap feature (a direct objekt-for-objekt trade flow built on Mutual), which may come later.
- Changing the one-way matching rules, For you's 50-person cap, the rings or the facet narrowing. The mutual score changes only as the Mutual counts sale lists item says.
- Removing `trade.forYou` or `listMatchCount` from the API.
- Listing idle posts under Mutual.
- Any database change.

## Impact

- `packages/api`:
  - `schemas/trade.ts`;
  - `services/trade-feed/` and `lib/trade-feed.ts` (a pure viewer narrowing, tested);
  - `services/trade-matches/` and `lib/trade-rank.ts` (the Mutual keyset, tested);
  - `routers/trade.ts` and `services/trade-tabs.ts`;
  - two new procedures, `trade.person` and `trade.mutualCount`.
- `apps/web`:
  - the `/trade` and `/trade/for-you` routes;
  - `features/trade/` (the Browse view, the post, the search helpers with tests, queries, the tabs, a new person sheet and Matching controls; the For you files are removed);
  - `notification-items.tsx`, `list-header.tsx` and `user-menu.tsx`;
  - en/ja/ko messages.
- `trade-active-hours` (not yet applied) needs re-anchoring; see design.md.
