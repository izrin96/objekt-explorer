## Context

- **One person's row today.** `person=<user id>` on `/trade` or `/trade/for-you` turns the feed into a one-row mode:
  - `person` sits in `feedSearchSchema` (`features/trade/browse-search.ts`);
  - `toBrowseInput` drops the artist selection for it;
  - `loadBrowse` loads it;
  - `BrowseView` renders `PersonLinkView` / `PersonLinkEmpty` (`person-link-view.tsx`).
  The server's `trade.people` with a first-page `person` returns that row or none, with no cursor. It already leaves out people who are hidden, blocked, trade-blocked, idle or sold out.
- **The row.** `PersonRow` (`person-row-view.tsx`) draws the header, the posts (`PostBlock`, with a per-post ⋯ menu holding Make offer and Show all), the ⋯ menu and `TradeActions`. Message's post card and Make offer address `leadPost(person.posts)`.
- **Names.** A row's `identity` (`toPartnerIdentity`, `lib/trade-rank.ts`) names the person by the profile with the most matches for this viewer. It depends on the viewer, so it cannot be an address. `defaultProfile` and `nameProfile` (same file) already pick the default profile and its name.
- **Profiles.** `user_address` holds `address` (unique), `nickname` (citext, indexed, not unique), `user_id` and `is_default`.
- **Metadata.** `generateMetadata` (`lib/meta.ts`) emits `title`, `og:description`, `og:image` and `twitter:*`. It emits no `og:title`, `og:url` or canonical link. The root sets `og:type`.
- **The prototype.** The throwaway route `/trade/person-prototype` on branch `proto/trade-person-page` compared three layouts. The user chose B: the feed's row in a centred page, Back to Trade above it, and on a post page the one post outlined with "Show N more posts".

## Goals / Non-Goals

**Goals:**
- Reuse `trade.people`'s one-person read and `PersonRow` as they are, so the page and the feed can't drift apart.
- Have one source for the handle, on the server and in the web.
- Make every redirect a `replace`, and do it before anything renders.

**Non-Goals:** see the proposal. In addition: no new cache, and no change to how `trade.people` ranks or filters.

## Decisions

**1. The handle is a pure function in `@repo/api/schemas`.**
- `tradeHandle(addresses)` (`schemas/trade-person.ts`) takes `defaultProfile`, then its lower-cased nickname through `realNickname`, else its lower-cased address. It returns `null` with no linked profile.
- Move `defaultProfile` and `realNickname` beside it if they are not already importable from schemas, so the web can import it without server code.
- The server uses it for:
  - `handle: string | null` on each `trade.people` row;
  - `handle` on `trade.myPosts`, the viewer's own, for Your posts' Copy links. The current user's `profiles` carry no `is_default`, so the web can't compute it;
  - `owner.handle` on a chat post card (`schemas/chat.ts`, `fetchPostCards`).
- *Alternative:* use `identity.nickname`. Rejected: it changes with the viewer and with matches.

**2. A new read, `trade.person`.**
- `optionalAuthed`, `GET /trade/person`. Input: `{ handle } | { userId }`. Output: `{ userId, handle }`, or `NOT_FOUND`.
- By handle, it finds the account:
  - an address handle matches `user_address.address`;
  - any other handle matches `nickname`, case-insensitively through citext;
  - either way only rows with a `user_id`, the newest id first, as `fetchUserByIdentifier` orders.
- It then loads that account's linked rows and returns `tradeHandle` of them, so the caller can tell the input wasn't canonical.
- By `userId`, it serves the old `person` and `partner` redirects. Ids are already public on every row, so this reveals nothing new.
- It shares the feed's rate limit (`limitFeed`).
- *Alternative:* resolve the handle inside `trade.people`. Rejected: the loader needs the canonical handle to redirect before it reads the row, and `head` needs it whether or not a row comes back.

**3. Routes.**
- `routes/(container)/trade/@{$handle}/route.tsx` is a layout with `staticData: { tradeChrome: false }` and the shared loader step: `trade.person({ handle })`, then `notFound()` or a `replace` redirect to the canonical handle. The redirect keeps the rest of the path and the search, so `trade-offer-page`'s `/offer?…` survives it.
- `index.tsx` is the person page.
- `$slug.tsx` is the post page. After the row loads, a slug that is a non-anchor side of a kept post redirects to the anchor's slug.
- Both load the row through `loadBrowse({ search: { person: userId }, surface: "browse" })`, so `toBrowseInput` drops the artist selection as it does today.
- The loaders return `{ userId, handle, row }`, where `row` is the first page's person or `null`, for `head`.
- `trade/@{$handle}` sits beside `for-you`, `mine` and `new` without clashing, since TanStack matches the `@` prefix literally.

**4. The page reuses `PersonRow`.**
- `PersonRow` gains `focus?: number` (a post id). With it, only that post renders, outlined with the `accent` ring (the current selection, per Look). The rest follow it in the row's order once "Show N more posts from <name>" is pressed, as local state.
- `led` and `onClear` go, since no feed leads a row now.
- On a post page the row's `TradeActions` target that post's anchor, with `matches.post` set, as `PostBlock`'s per-post Make offer does. Message's card names it too.
- The owner's Edit post and Take down use the Your posts menu's actions (`startForPost`, the take-down mutation). Edit post links to `/trade/new?edit=<slug>&from=<this page>`, from `trade-post-page`.
- The page wraps the row in `PageMain`-width chrome: Back to Trade (a `Link` to `/trade`), the row, then the expand button. It mounts its own `ObjektDrawer`.
- `PersonLinkView`, `PersonLinkEmpty` and the banner strings go. The empty state is the existing `EmptyState`.
- *Alternative:* a new page component. Rejected: variant B is the row as Browse draws it, and two copies would drift.

**5. Old links redirect in `beforeLoad`.**
- `/trade` and `/trade/for-you` check `person` (and For you `partner`) first. Only when one is present do they call `trade.person({ userId })`.
- On success they throw a `replace` redirect to `/trade/@<handle>`. On `NOT_FOUND` or a `null` handle they redirect to the same path without that parameter.
- `person` stays in `feedSearchSchema`, and `partner` in For you's, marked "read only to redirect" as `matches` is. `beforeLoad` only sees what `validateSearch` returns, and `FeedSearch` keeps `person` for the person page's own `loadBrowse` call. The feed routes never pass it on, because `beforeLoad` redirects first.
- On `/trade/for-you` the person redirect runs first, before For you's signed-out redirect to `/login` and before `browseRedirect` on `/trade`. A signed-out `?person=` link therefore lands on the person page, not on sign in.
- `browseRedirect`, `forYouNormalise` and `forYouFallback` stop carrying `person`, and their tests change with them.

**6. Copy link.**
- `useCopyTradeLink` takes `{ handle, slug? }` and builds `/trade/@handle[/slug]` with `router.buildLocation`.
- The row's ⋯ menu and Your posts' header copy the person page. `PostBlock`'s ⋯ menu and each Your posts entry menu copy the post page.
- With no handle the item is disabled and its reason reads "Link a Cosmo profile first", using the disabled-with-reason pattern Your posts' Copy link already has.

**7. Metadata.**
- `generateMetadata` gains an optional `url`. With it, it emits `og:title` (the page title without the site suffix), `og:url` and `links: [{ rel: "canonical", href }]`, always absolute through `getBaseURL()`.
- `live/$id` keeps working unchanged, since `url` is optional.
- The preview never reads what depends on the viewer:
  - the name is the handle's: the nickname, else the truncated address, never `identity.name`, which follows the viewer's matches;
  - the card image is the first item of the offering side in the list's own order, never the strip's ringed-first order.
  - The URL is already absolute, a Cosmo CDN URL.
- A viewer the row isn't shown to (hidden, blocking) gets `row: null`, so their `head` is the plain Trade title. Crawlers have no session, so a shared link previews in full.
- The text comes from a pure `sharePreview({ handle, posts }, post?)` beside its tests (`features/trade/share-preview.ts`). If a side's items arrive ringed first, the loader reads the side's own order with `trade.sideItems` (`limit 1`), or the feed adds a `first` item to each side. Decide which while building; both are read-only.
- Titles and descriptions are `m.*` strings in the server-rendered locale; tags such as WTT stay untranslated.

## Risks / Trade-offs

- [A nickname change or a new default profile changes the handle] → The old address still resolves, because any linked nickname redirects to the current handle. Only a nickname that left the account stops working, and it shows not-found.
- [Two `user_address` rows can share a nickname] → Only linked rows count, newest first, as the profile page already resolves them.
- [An edit that changes the anchor list changes the post's address] → The old link shows "no longer on Trade" above the person's posts, so the visitor still lands on the person.
- [Old tabs still build `?person=` links] → The redirect serves them.
- [The rate limit on page loads] → The person page makes two limited calls (`trade.person`, `trade.people`), where the feed made one. Signed out, `limitFeed` allows 120 a minute per IP, so a link shared to a busy Discord server previews well within it. A crawler over the limit gets the plain Trade title, never an error page, because the loader catches the refusal.
- [Scrapers read the server-rendered `head`] → The loader awaits the row (not `.catch`-to-undefined for the head data), and a failed read falls back to the plain Trade title rather than failing the page.

## Migration Plan

There is no database change.
- Deploy the API and web together: the web reads `handle` and `trade.person`. An old tab keeps its bundle, and its `?person=` links redirect once loaded.
- No cache changes shape. `handle` is added to `trade.people`'s output, which no Redis key stores; `trade:person:8` caches matches, not rows. Confirm both while building, and bump the version if either holds rows.
- Rollback: revert the web. The old `?person=` mode comes back, and the API's extra field and read go unused.
