## Why

C1 left `apps/web` as a document shell with a `PageHeader` on `/`. Every feature slice
(C3–C7) renders inside a navigation frame with a session, an artist scope and a way to reach
other pages. Landing that frame once, wired to the real `@repo/api`, means the parallel
slices start from a signed-in, navigable app instead of each re-deriving the ORPC client,
session query and nav.

## What Changes

- **API wiring.** `lib/orpc.ts` (isomorphic ORPC client + `@orpc/tanstack-query` utils),
  `lib/api-messages.ts`, `lib/auth-client.ts`; routes `rpc.$.ts`, `api/auth.$.ts`,
  `api/user.search.ts`, `api/healthcheck.ts` copied from `website` against `@repo/api`;
  `server.ts` and a `dev-websocket.ts` gain the activity WebSocket from `@repo/api/activity`.
- **Root loader** prefetches `config.getArtists`, `config.getSelectedArtists` and
  `user.currentUser`; `CosmoArtistProvider` (ported from the website hook) wraps the tree.
- **Navigation frame**, ported from the lab: `AppNav` (logo with status dot, four links,
  status button, search field, avatar or signed-out actions), `MobileNav` sheet, `NavSearch`
  ⌘K dialog now hitting `/api/user/search` with a persisted Recent group and "Clear history",
  `SystemStatus` on `orpc.status.get`, `UserMenu` on the real session with Artists submenu,
  Settings and Sign out (`authClient.signOut` + query invalidation), `SignedOutNav`.
- **Settings**: the lab dialog with theme (store), language (Paraglide `setLocale`), wide
  and hide-label switches, and the Artists section. Artist scope moves off the lab's local
  store onto the website mechanism: `config.setArtists` cookie + `getSelectedArtists` query,
  so SSR renders the right scope; the lab's "at least one artist stays on" rule is kept in the UI.
- **Placeholder routes** `/market`, `/activity`, `/list`, `/link`, `/login` rendering only
  a `PageHeader`, so every nav and menu link type-checks today; C4, C6 and C7 replace their
  bodies. `/login` carries its `redirect` search param from the start.
- `stores/settings.ts`: `language` removed (Paraglide owns it), `hideLabel` added.

## Non-goals

- No objekt data, filters or grids (C3); no market, activity, profile, list, compare, auth
  forms, account dialog or Cosmo link flows (C4–C7). Menu items whose targets do not exist
  yet (My lists, My Cosmo, Account) are added by the slice that adds the target.
- No currency setting (needs the rates service; C4 adds it to this dialog).
- No About or Changelog modal: the lab dropped them and the plan follows the lab. Flagged
  for the user; either can come back as a small C8 item.
- No change to `apps/website`, `apps/lab` or `packages/*`.

## Surfaces covered

`apps/web`: every route, via the nav; `/` in detail; the five placeholder routes.
Lab references: `components/{app-nav,mobile-nav,nav-search,user-menu,system-status}.tsx`,
`components/account/settings-dialog.tsx`, `components/artist-avatar.tsx`, `store/{session,artists,settings}.ts`.
Website references: `components/layout/{navbar,user-nav,user-search,status-popover,settings-modal}.tsx`,
`hooks/{use-user,use-cosmo-artist,use-selected-artists,use-user-search-store,use-config}.ts*`,
`lib/{orpc/client,auth-client,query-options}.ts`, `routes/{rpc.$,api/auth.$,api/user.search,api/healthcheck}.ts`.

## Capabilities

### New Capabilities

- `web-shell`: the navigation frame of `apps/web` — links and active state, mobile sheet,
  user search with recents, session-aware account area, artist scope, system status,
  device settings.

### Modified Capabilities

None.

## Impact

- `apps/web` gains `@orpc/client`, `@orpc/server`, `@orpc/tanstack-query`, `better-auth`,
  `@repo/api`, `@repo/cosmo`, `ofetch` (`catalog:`) at the versions `website` pins.
- ~20 new files under `apps/web/src`; `__root.tsx`, `router.tsx`, `server.ts`,
  `stores/settings.ts` edited. Nothing outside `apps/web` except `bun.lock`.
