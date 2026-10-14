## 1. URL rules

- [x] 1.1 In `apps/web/src/features/trade/browse-search.ts`:
  - add `browseRedirect(search)`, which returns the `/trade/for-you` search for `match=any|mutual` or `matches=1`, the cleaned Browse search for `match=off` or a stray `list`, and `null` otherwise;
  - rework `forYouSearchSchema` into Browse's filters plus `match` (`any`, `mutual`, `they_have`, `they_want`), `list`, `person` and the old `partner`;
  - add `forYouNormalise(search)`, which maps `they_*` to `any` and `partner` to `person`, or returns `null` when there is nothing to change;
  - replace `forYouToBrowse`;
  - drop `matchModeOf`'s Off and `slug` defaults.

  Cover each mapping in `browse-search.test.ts`, including the spec's Old Browse link, Old Only matches link, Old Off link, One-way view and Partner link scenarios. Verify with `bun test apps/web/src/features/trade/browse-search.test.ts`, then lint and typecheck for `web`.

## 2. Routes

- [x] 2.1 Move the `/trade` loader body into one shared loader function in `features/trade/` that takes the surface (`"browse"` or `"forYou"`). Browse sends `match: "off"`. For you sends `search.match ?? "any"` and skips the Your posts query. Verify that `/trade` still renders every post, and that lint, typecheck and `bun run build --filter=web` pass.
- [x] 2.2 Give `routes/(container)/trade/index.tsx` a `beforeLoad` that throws a `replace` redirect from `browseRedirect`. Verify by opening `/trade?match=mutual&list=<slug>`, `/trade?matches=1` and `/trade?match=off`: each must land as the web-trade-browse "Matches and Compare with" scenarios say. Lint, typecheck and build `web`.
- [x] 2.3 Turn `routes/(container)/trade/for-you.tsx` into a page:
  - its `beforeLoad` first runs `forYouNormalise` (one `replace` redirect), then `requireSignedIn`, then redirects a viewer for whom `canMatchOf` is false to `/trade` with the filters only;
  - the loader is the shared one with `"forYou"`;
  - the component renders `BrowseView` with `surface="forYou"`;
  - its head uses the Trade page title.

  Verify the Signed out and No list that can match scenarios, and that `/trade/for-you?match=they_want&partner=<id>` lands on `match=any&person=<id>`. Lint, typecheck and build `web`.

## 3. View and controls

- [x] 3.1 In `browse-view.tsx`, add `surface: "browse" | "forYou"`:
  - Browse: no `MatchingControls`; Your posts kept; the matches prompt only for a viewer who can't match, its Sign in link redirecting to `/trade/for-you`;
  - For you: `MatchingControls`, no Your posts and no prompt.

  Empty states use the For you copy that already exists for no matches and no mutual people. On Browse, a viewer with a list sees no line beside the Type tabs. Lint, typecheck and build `web`.
- [x] 3.2 In `matching-controls.tsx`:
  - `MODES` becomes Any and Mutual;
  - remove the `mode !== "off"` guards so Compare with and the compared-lists line always show;
  - narrow the props to `"any" | "mutual"`;
  - delete the `trade_matches_off` message from en, ja and ko if nothing else uses it.

  Lint, typecheck and build `web`. (Superseded by 3.6: the control is now a Mutual only switch with no phone sheet.)
- [x] 3.3 In `trade-tabs.tsx`, add For you (`/trade/for-you`) between Browse and My trades, shown only when `canMatchOf(currentUser.lists)` is true:
  - its count comes from `mutualCountOptions(undefined)`, with the same 99+ cap and accessible name as My trades;
  - the prefetch effect also prefetches that query for a viewer who can match;
  - add `trade_tab_for_you` ("For you") in en, ja and ko.

  Verify the web-trade-browse "Trade tabs" scenarios: Counts, No list that can match and Signed out (no count is requested). Lint, typecheck and build `web`. (The tab count was later moved to the switch, see 3.8; the tab carries none.)
- [x] 3.4 Reword `trade_browse_matches_need_list` and `trade_browse_matches_sign_in` in en, ja and ko so they name For you, for example "Sign in to see posts that match your lists in For you." Verify that `bun run --filter=web typecheck` compiles Paraglide clean.

- [x] 3.5 Replace the Type tabs with a Post type menu (`SingleSelect`, options spelled out by `tagText`) on both surfaces; under Mutual, WTB and WTS are disabled, and `postTypeOf` in `browse-search.ts` (tested) reads a leftover `wtb`/`wts` as All for the view and `toBrowseInput`; switching to Mutual drops it from the URL. Verified with `browse-search.test.ts`, web lint and typecheck.
- [x] 3.6 Replace the Any · Mutual tabs and the phone Matching sheet with a Mutual only switch beside Compare with and the help, on one wrapping row; the switch counts only for a named list, and the help's modes table becomes two lines. Verified with web lint and typecheck.
- [x] 3.7 Remove the switch's per-list count, rewrite the help bullets (en, ja, ko), and stop a leftover `type` under Mutual from counting as a filter. Verified with web lint, typecheck and tests.
- [x] 3.8 Move Mutual N from the For you tab to the Mutual only switch, shown on or off for the current Compare with choice. Verified with web lint and typecheck.
- [x] 3.9 Close review findings: the help states the mutual score and that sale lists must be profile-bound too (en, ja, ko); the server forces WTT whenever `match=mutual`; `forYouFallback` keeps the person sheet. Verified with `bun run check`.

## 4. Links

- [x] 4.1 Point these at `/trade/for-you` with their current search:
  - `features/notifications/notification-items.tsx` (want-list and reverse alerts);
  - `components/layout/user-menu.tsx` (Trade matches, `match: "mutual"`);
  - `features/list/list-header.tsx` Find matches.

  Leave the list header's On Trade badge, the drawer's `slug` link and My trades' Browse button on `/trade`. Verify with grep that no `to="/trade"` carries `match` or `list`, then lint, typecheck and build `web`.

## 5. Check

- [x] 5.1 Run `bun run check` and `bun run build --filter=web` from the root. Then, with the dev server running, walk through these in the browser, and record each as passed or failed:
  - Browse as signed out;
  - Browse as a viewer without a list;
  - Browse as a viewer with a list (own post listed, no matching controls);
  - For you with Mutual only off and on, with Compare with naming a list;
  - Mutual only: the Post type menu reads WTT with the rest disabled, only WTT posts are listed, and no Reset shows for a leftover `type`;
  - every redirect in task 2;
  - the "Mutual only N" count on the switch, with All my lists and with a named list;
  - the controls row and the two-line strips at 390 px and at desktop width, with no horizontal scroll and no clipped third line.
  - Not run before archiving (2026-10-15): `bun run check` and the web build pass, but no dev server was up, so the browser walkthrough is still owed.
  - Walked through 2026-10-15 on a local dev server against the local database, all passed: Browse signed out (no For you tab, sign-in line); Browse as a viewer without a list (no For you tab, and `/trade/for-you` lands on `/trade` with the filters and `person` kept); Browse as a viewer with a list (own post listed with no chip or Make offer, no matching controls); For you with Mutual only off and on, and with Compare with naming a list (`list=` in the URL); Mutual only reads WTT with All, WTB and WTS disabled, lists only WTT posts, and `type=wts` leaves Reset disabled; every redirect in task 2, signed in and signed out; "Mutual only 1" on the switch with All my lists and with a named list; the controls row and strips at 390 px and 1280 px with no horizontal scroll and no clipped strip. The no-list line was removed afterwards at the user's request (see the `web-trade-browse` spec).
- [x] 5.2 Update `apps/web/AGENTS.md` if it describes the Browse Matches modes or the For you redirect. Otherwise state in this task that no package's `AGENTS.md` conventions changed.
  - Checked: `apps/web/AGENTS.md` does not describe the Matches modes or the For you redirect, so no `AGENTS.md` changed.
