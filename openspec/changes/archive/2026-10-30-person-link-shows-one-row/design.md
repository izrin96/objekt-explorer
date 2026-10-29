# Design

## Context

`trade.people` (`packages/api/src/services/trade-feed/people.ts`, `peopleFeed`) builds the whole people order for the filters, stores it for paging, and, when `input.person` is set on the first page, loads that person as `led` and puts the row in front. A person the feed would not list never becomes `led`, so the link quietly falls back to the plain feed. The client sends the visitor's artist selection as `artist` through `toBrowseInput` (`apps/web/src/features/trade/browse-search.ts`), which the loader and the view share so their query keys match. Browse and For you both render through `browse-view.tsx`, where the led row carries Show everyone (`clearLead`).

A first attempt dropped the artist selection for the whole person-link request while the feed still followed the row. A person who did not lead then left the visitor on an unfiltered feed with no way back. Showing one row removes that feed, which is what makes dropping the selection safe here.

## Goals / Non-Goals

**Goals:**
- One request path for a person link that does no order building, storing or paging.
- Keep today's rule for who may lead, so hidden, blocked, trade-blocked, idle and For you no-match people stay out exactly as now.

**Non-Goals:**
- Any change to the order, cursor or stored-order code used without `person`.

## Decisions

**1. Short-circuit `peopleFeed` on a first-page `person`.** When `input.person` is set and there is no cursor, skip `openOrder` and return `{ people: led ? [led] : [], nextCursor: undefined, collections }`, with `led` loaded by `loadPeople(ctx, query, [person])` as today.
- **Under Mutual only:** the person must still be in the Mutual set. Work it out for that one person: `mutualPeopleOf(match)` filtered to them, then the kept-WTT check `buildOrder` does with `fetchFeedOwners(feedQueryOf(ctx, "wtt"), [person])`.
- **Counts and sections:** For you's counts come from `ctx.match` inside `loadPosts`, as now. The section is left `undefined`, as the led row has it today.
- **Alternative considered:** keep building the order and drop everything after `led`. Rejected: it pays for the full order and the stored-order write to show one row.

**2. Drop the artist selection in `toBrowseInput` when `person` is set.** `artist` becomes `search.artist ?? []`, unfiltered by the selection, so an `artist` written in the link still applies.
- **Why the client:** it is the only place that knows which `artist` values came from the visitor's picker and which from the URL. The server can't tell them apart. It also keeps the loader and the view on one query key.
- **Safety:** with Decision 1 there is no feed below the row for this to widen, and Show everyone removes `person`, which brings the selection back.
- **Alternative considered:** have the server ignore `artist` for the led row only. Rejected: it would also drop an `artist` the link carries, and needs a second, unscoped feed query.

**3. Empty state in `browse-view.tsx`.** A new branch comes before the existing empty states: `search.person` is set, `people` is empty and the query has settled.
- **Contents:** the existing `EmptyState` with a generic title and hint, plus a Show everyone button that calls `clearLead`.
- **No name:** the server returns nothing for a person who can't lead, and a name would reveal a hidden or blocking account.
- **Copy:** new strings `trade_person_empty_title` and `trade_person_empty_hint`. The button reuses `trade_person_clear`.

**3a. Banner and line around the one row (prototype variant C).** A shared-link view was prototyped three ways on branch `prototype/person-link-ui`: a person page, a sticky bar with type tabs, and a banner over today's row. The banner (C) won. It keeps the page Trade, and it needs the least new UI.
- **Banner:** in `person-link-view.tsx`, between the filters and the row. It names the person and adds "*N* objekts are on your lists" when signed in and above zero.
- **Copy link:** copies the `/trade` address with `person` and the link's filters, dropping For you's `match` and `list`, which are the viewer's own.
- **Show everyone:** `clearLead` drops `person` and the link's filters together, keeping For you's matching choice, so the visitor gets the feed as usual.
- **While loading:** under a filter change the view stays at reduced opacity with `aria-busy`, and the hidden-partners note stays off person views.
- **The count:** the sum of `listCount` over the row's posts and sides, the numbers the row's strips already show.
- **The row:** rendered with `led={false}`, so it has no clear button of its own; the banner owns the way back.
- **The line under the row:** a text-only button that calls `clearLead`. The server sends one row, so there are no other people's avatars to show.
- **Copy:** new strings for the banner, its count, and the line.

**4. Trade block for Copy link.**
- **Server:** `fetchMyPosts` adds `tradeBlocked: boolean` to each post, the way `lastBumpAt` rides on each. It comes from one `SELECT NOT (notTradeSanctioned(userId))`, the same definition the feed uses.
- **Post item:** disabled with a reason line when `tradeBlocked` or idle, with the trade block reason first.
- **Row button:** disabled when `tradeBlocked` or nothing is listed.
- **Alternative considered:** read the sanction from the current-user query. Rejected: that query doesn't carry sanctions, and the posts query is already the thing Copy link reads.

**5. The row button's reason.** The shared `Button` renders a native `<button>`, and a native `disabled` button can't be focused, so no tooltip on it reaches keyboard or touch users.
- **Behaviour:** the button stays focusable with `aria-disabled="true"`, styled as disabled. Activating it shows an info toast with the reason instead of copying.
- **Precedent:** this matches how the post item's reason reads on activation.
- **Copy:** reasons reuse `trade_post_copy_link_idle`, plus a new `trade_post_copy_link_blocked`.

**6. Idle reason layout.** The post item takes `trade-menu.tsx`'s pattern: `items-start py-1.5` on the item, `mt-0.5` on the icon, and `text-muted-foreground` on the reason line.

## Risks / Trade-offs

- **The banner names the person:** → only when their row is shown, which names them already; the empty state stays unnamed.
- **Already-sent chat cards:** a person link sent before this change now opens to one row → intended (proposal, BREAKING); the URL is unchanged and Show everyone restores the feed.
- **Sold-out posts:** a post whose objekts are all sold out keeps Copy link enabled and lands on the empty state → accepted (proposal Non-goals); the empty state explains instead of looking broken.
- **Artist outside the picker:** an `artist` in the link outside the visitor's selection appears as a chip the Artist menu can't toggle → existing behaviour for any such link; unchanged.
- **Mutual check for one person:** `mutualPeopleOf` still ranks every Mutual person → same cost as today's request, which ran it anyway; can be narrowed later without changing behaviour.

## Migration Plan

No data or API-shape migration: `tradeBlocked` is an added field, and `people` keeps its shape. Web and API deploy together (one image). Rollback is a redeploy of the previous image.
