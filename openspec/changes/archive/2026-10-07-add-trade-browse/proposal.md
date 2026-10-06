## Why

Phase 1 added Trade › For you, but nobody can browse who is trading: WTT, WTB and WTS posts still live on Discord and Twitter. Market stays the sale-only collection grid. Trade needs a feed of posts by people: opted in per list, refreshed by Bump, and dropping idle posts.

## What Changes

- **Show on Trade**: a per-list opt-in on have, want and sale lists, off for every existing list. A list on Trade is always discoverable, and turning discoverable off also takes it off Trade.
- **Browse feed** at `/trade`, open to signed-out visitors:
  - one post per list on Trade, or per linked have + want pair;
  - tagged WTT (a have list, alone or paired), WTB (a want list alone) or WTS (a sale list);
  - filters: type, the shared collection filters, and one collection (`slug`);
  - newest activity first, with infinite scroll;
  - posts idle for 30 days drop out until bumped;
  - have and sale entries the owner no longer holds, or cannot transfer, are hidden.
- **Viewer matching** when signed in:
  - each post counts its wants on the viewer's have lists and its haves on the viewer's want lists, and rings those objekts (have lists, not the wallet, so objekts kept back never count);
  - a "They want something I have" toggle, on by default when the viewer has a have list;
  - posts by partners hidden in For you are left out.
- **Bump**: once every 24 hours per post. It moves the post to the top and brings back an idle one. Bumping a pair bumps both lists, and turning Show on Trade on counts as one.
- **Your posts** strip on Browse: when each post was last bumped, a Bump control, and a Post a list dialog that switches Show on Trade per list.
- **Tabs**: `/trade` (Browse) and `/trade/for-you` share a tab bar. `/trade` no longer redirects.
- **Navigation**: Trade joins the primary nav after Market.
- **List header**: marks a list that is on Trade.
- **Objekt drawer**: the Market tab counts the posts that have or want the collection and links to `/trade?slug=<slug>`.

## Non-goals

- Chat, Message and Propose (phase 3).
- Offers, verified trades, reputation and the My trades tab (phase 4).
- Blocking and moderation (phase 3).
- WTB top prices (want lists have no currency) and price-based alerts.
- Sort options beyond newest activity.
- Linking sale lists.

## Capabilities

### New Capabilities

- `web-trade-browse`: the `/trade` Browse feed, covering:
  - posts, pairing and tags;
  - filters;
  - ownership hiding;
  - viewer matching;
  - idle drop-off;
  - Bump, Your posts and Post a list;
  - the Trade tab bar.

### Modified Capabilities

- `web-trade-for-you`: `/trade` opens Browse, not For you.
- `web-lists`: Manage lists gains Show on Trade, tied to discoverable. The header marks a list that is on Trade.
- `web-shell`: primary navigation gains Trade.
- `web-objekt-browser`: the drawer's Market tab gains the On Trade line.

## Impact

- **DB**: a migration adds `lists.show_on_trade` (default false), `lists.bumped_at` and a partial feed index. It is applied locally only until ship.
- **API**:
  - `trade.browse` (public, viewer-aware), `trade.bump`, `trade.myPosts` and `trade.collectionPostCounts`;
  - an optional `showOnTrade` on list create and update, which keeps `/rpc` compatible with open tabs;
  - reuses phase 1's ownership helpers.
- **Web**:
  - the `/trade` route becomes Browse, under a Trade layout with tabs;
  - new browse components;
  - edits to `app-nav`, `mobile-nav`, the list form, `list-header` and the drawer's Market panel;
  - en, ja and ko strings.
- **Cache**: Valkey holds each list's ownership-checked entries (60 s) and each viewer's have-list collections (5 min).
- **Untouched**: worker, indexer, notifications.
