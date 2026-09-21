## Context

See proposal.md. `web/main` has the C1 shell (`__root.tsx` with theme script, `(container)`
layout, settings store, cnippet kit) and C0's `@repo/api` (`router`, `services/auth`,
`services/redis`, `services/token`, `schemas/*`, `activity`, `constants`; `ApiMessages` in
`@repo/api/orpc`). The website's ORPC client, auth client, root loader and the four API
route handlers are the wiring to copy; the lab's nav components are the UI to copy. The
lab fakes three things the website does for real: session (a flag), artist scope (local
store), user search (fixtures) and status (a timer).

## Goals / Non-Goals

**Goals:** a signed-in, navigable `web` on real data with every link type-checked; the
patterns later slices copy (`features/<domain>/queries.ts`, `useCurrentUser`, `orpc.*.queryOptions`).

**Non-Goals:** account dialog, lists submenu, Cosmo link, About/Changelog (proposal.md).

## Decisions

**1. Feature folders.** `components/layout/` holds the frame (`app-nav`, `mobile-nav`,
`nav-search`, `user-menu`, `system-status`). `features/user/` holds `queries.ts`
(`currentUserOptions = orpc.user.currentUser.queryOptions({ staleTime: Infinity, refetchOnWindowFocus: false })`),
`hooks.ts` (`useCurrentUser`, `useUserProfiles`, `useUserLists`) and `search-store.ts`
(persisted zustand, key `web:recent-users`, `CosmoPublicUser[]`, max 7, dedupe by nickname,
as the website's store). `features/artist/` holds `cosmo-artist-provider.tsx` (the website's
`use-cosmo-artist.tsx` verbatim minus intentui), `use-selected-artists.ts` (query +
`setArtists` mutation that invalidates `getSelectedArtists`) and `artist-avatar.tsx` (lab
component reading `logoImageUrl` from `getArtists` instead of the fixture). `features/settings/`
holds `settings-dialog.tsx` and `artists-menu.tsx` (submenu + checkbox section).

**2. Session is the `currentUser` query, not a store.** The lab's `useSession` flag goes.
`useCurrentUser` is `useSuspenseQuery(currentUserOptions)` prefetched by the root loader, so
the nav never suspends on the client. Sign out: `await authClient.signOut()` then
`queryClient.invalidateQueries()` for `currentUserOptions` (and a toast). Alternative
considered: `authClient.useSession()` — a second source of truth next to the ORPC query the
rest of the app reads.

**3. Artist scope is the cookie.** The lab's local `useArtists` store is replaced by the
website's `config.getSelectedArtists` / `config.setArtists`; UI keeps the lab's submenu and
checkbox section and its "last one stays on" guard (the website treats an empty selection
as all, which the guard makes unreachable, so behaviour is a superset). `scopeArtists` from
the lab store is not ported; scoping happens server-side through `selectedArtistsMiddleware`.

**4. Settings store.** Drop `language` and `LANGUAGES` (Paraglide `getLocale`/`setLocale`
own it; `setLocale` sets the cookie and reloads). Add `hideLabel: boolean` for C3's card.
Keep `theme`, `wide`, `SETTINGS_STORAGE_KEY`. Theme option labels come through `m.*`
(`common_settings_theme_*` keys exist).

**5. Search.** Lab `NavSearch` structure (Dialog + inline Combobox, Recent/Users/Address
groups, footer kbd hints) with data from `useQuery({ queryKey: ["user-search", q], queryFn: ofetch("/api/user/search") , enabled: q.length > 0 })`
debounced 350 ms through the lab's `useDebouncedCallback`. Row type becomes
`{ kind: "user"; user: CosmoPublicUser }` (avatar from `user.profileImageUrl` with fallback);
`verified` badge dropped unless the Cosmo payload carries it. Navigation target is
`/@{$nickname}` — that route does not exist until C5, so C2 adds a placeholder
`routes/@{$nickname}/route.tsx` + `index.tsx` rendering the nickname in a `PageHeader`
(C5 replaces both). A 429 from the endpoint renders the empty state with the server message.

**6. Placeholder routes** (`/market`, `/activity`, `/list`, `/link`, `/login`, `/@{$nickname}`)
are one `createFileRoute` each with a `PageHeader` whose title is the existing `nav_*` /
`*_title` message; `/login` declares `validateSearch: z.object({ redirect: z.string().optional() })`.
Alternative: untyped `<a href>` in the nav — rejected, it forfeits the router's typing and prefetch.

**7. Root.** `__root.tsx` gains `loader` (three `ensureQueryData`), `CosmoArtistProvider`
and `<AppNav />` above the `overflow-x-clip` div's `<Outlet />`; `router.tsx` is unchanged
(query client already in context). `server.ts` and new `dev-websocket.ts` are the website's
with `@repo/api/activity` imports; `package.json` gains `dev:ws`.

**8. Copy discipline.** Lab files are copied, then edited only where a fixture or store is
replaced by the real source, and narrative comments are dropped on the way (config rule).
Strings become `m.*`; new keys (lab copy with no website equivalent, e.g. the search footer
hints, "Open address") are added to `messages/en.json` with `ko`/`ja` translations.

## Risks / Trade-offs

- [Root loader now needs the database, Redis and Cosmo token; dev without `.env` fails
  loudly] → same as `website`; documented in AGENTS.md at C8.
- [`useSuspenseQuery` in the nav suspends on the client if the loader did not prefetch] → the
  loader prefetches all three; verify no pending flash on client-side navigation.
- [`authClient` base URL differs per port] → `getBaseURL()` copied from the website reads
  `VITE_SITE_URL`; dev uses `http://localhost:3200`, set in `.env` only for the smoke.
- [Placeholder routes ship to `web/main`] → they render a real header and are replaced within
  the programme; `web` is not deployed before C8.

## Migration Plan

Additive; nothing deploys.
