## Why

`design/web-migration-plan.md` replaces `apps/website` with a new TanStack Start app,
`apps/web`, built from the `apps/lab` prototype. Every later slice (shell, objekt grid,
profile, lists, auth) needs the same foundation: the app package, the Vite and Start
configuration, the lab's token sheet and Base UI component kit, routing with React Query
integration, Paraglide, and the theme and layout settings. Landing that foundation on its own,
in parallel with the server-layer extraction (C0), lets the feature slices start from a
building, linting, type-checked app instead of each one carrying scaffold work.

## What Changes

- New workspace app `apps/web` (package name `web`, dev port 3200) on the same stack as
  `website`: TanStack React Start, Vite 8, React 19 with the React Compiler, Tailwind 4,
  Paraglide (locales `en`, `ko`, `ja`, cookie strategy), `oxlint` and `tsc` wired the same way.
- The lab's foundation copied in, not referenced: `styles/app.css` (the cnippet token set),
  `components/ui/*` (32 registry files, verbatim, with the colour-picker's local-fix block),
  `components/shared/*` (page-header, empty-state, data-table, copy-button, time-ago, note,
  shimmer, social-badge, apollo-icon, banner-field), `lib/{utils,a11y,color,address,time,dev-overflow-guard}`,
  `hooks/{use-debounced-callback,use-element-size,use-long-press}`, and the settings store
  (theme, language, wide) with its `<html>` mirroring, persisted under `web:*` keys.
- Root route: SSR document shell with `HeadContent`/`Scripts`, `lang` from Paraglide, the
  website's metadata generator, favicons and manifest, a blocking inline script that applies
  the persisted theme and `wide` setting before first paint, `ToastProvider`, and the lab's
  `overflow-x-clip` wrapper with the dev-only overflow guard.
- A `(container)` layout route carrying the lab's `containerClass` `<main>`, a home route
  rendering only `PageHeader`, and router default error, not-found and pending components
  built from the lab's `EmptyState` and `Button`.
- Router with a `QueryClient` in context and SSR-query integration, mirroring
  `apps/website/src/router.tsx`; no ORPC client yet (that is C2).
- `apps/web/server.ts` production Bun server copied from `website` minus the WebSocket lines
  (added in C2 from `@repo/api/activity`).
- `knip.json` gains the `apps/web` workspace; `.superset/config.json` `run` gains
  `bun run dev --filter=web`.

## Non-goals

- No nav, search, user menu, session, ORPC client or `rpc.$` route (C2).
- No data fetching, no feature folders, no stores beyond settings.
- No Dockerfile, CI or `docker-compose` entry for `web` (C8).
- No pruning of `messages/*.json`: the three files are copied whole and pruned at cutover.
- No `tanstack-theme-kit`: the lab's settings store owns theme, see design.md.
- No change to `apps/website`, `apps/lab` or any package.

## Surfaces covered

`apps/web` routes `/` (shell + `PageHeader`) and any unknown path (not-found component).
Lab reference surfaces: `routes/root.tsx`, `components/ui/*`, `components/shared/*`,
`store/settings.ts`, `styles/app.css`, `index.html` (the pre-paint theme script).

## Capabilities

### New Capabilities

- `web-app-shell`: the `apps/web` document shell — theme and layout-width settings applied
  before first paint and kept in sync, locale resolution, container layout, default
  error/not-found/pending surfaces.

### Modified Capabilities

None.

## Impact

- New directory `apps/web` (~50 copied files plus ~15 new). New dependencies are the union
  the lab and the website already carry; nothing new enters the root catalog.
- `knip.json`, `.superset/config.json`: one entry each.
- `bun.lock` updated by `bun install`.
- Turbo picks the new workspace up automatically; `bun run dev` now starts four apps unless
  filtered.
