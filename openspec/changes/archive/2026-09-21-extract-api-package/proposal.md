## Why

`apps/web` (the Base UI rewrite, see `design/web-migration-plan.md`) needs the same ORPC
routers, Better Auth configuration, database services and activity WebSocket server that
`apps/website` runs today. They live under `apps/website/src/lib`, so a second app could only
reach them by copying. Moving them into a workspace package first means both apps run one
server layer during the overlap and `web` never re-implements a query.

## What Changes

- New workspace package `packages/api` (`@repo/api`) holding, moved verbatim from
  `apps/website/src/lib`: `server/api/**` (ORPC middleware + 12 routers), the `*.server.ts`
  services (auth, redis, s3, mail, token, objekt, list, privacy, rarity, artist, cookie),
  `query-logger.ts`, `currency-rates.ts`, `utils.server.ts`, `activity-websocket.server.ts`,
  `universal/*.ts` (zod schemas and types shared by client and server), `env/server.ts`.
- The four app-only couplings inside that code are cut, with no observable change:
  - Localised API error strings (`m.api_errors_*`, 13 keys in four routers) become a
    `messages` record the app supplies in the ORPC initial context.
  - Better Auth's i18n plugin stops calling the app's Paraglide `getLocale()` and relies on
    its own `PARAGLIDE_LOCALE` cookie detection with default `en`, which is what Paraglide's
    `["cookie", "baseLocale"]` strategy resolves to.
  - `betterAuthLocale` translations, `SITE_NAME` and `MAX_FILE_SIZE` move into the package;
    the app re-exports where its own code reads them.
  - `apps/website` import paths are rewritten to `@repo/api/...`. The Start server-function
    wrappers (`lib/functions/*`, `lib/server/middleware.ts`), the isomorphic ORPC client, the
    `rpc.$` and `api/*` route handlers, `server.ts` and `dev-websocket.ts` stay in the app.
- `knip.json` gains the `packages/api` workspace; the root catalog gains nothing new.

No route, endpoint, response shape, cookie or database behaviour changes. This is a pure
move plus dependency injection, and the change opts out of specs for that reason.

## Non-goals

- No `apps/web` files. That is change C1 (`web-scaffold`).
- No refactor of router logic, no renaming of procedures, no query changes.
- No move of React Query option builders (`lib/queries/*`), hooks or components.
- No change to `apps/worker` or `apps/indexer`; neither depends on `@repo/api`.
- No Docker or CI changes; `turbo prune website --docker` already carries workspace deps.

## Surfaces covered

Every `apps/website` route is affected at the import level and none at the behaviour level.
The ones exercised for the smoke check: `/` (collections router + filter data), `/@<nickname>`
(profile, pins, locked objekts), `/list` and `/list/<slug>` (list routers), `/market`,
`/activity` (WebSocket at `/api/activity` + `ws://localhost:3001`), `/login` and
`/api/auth/*`, `/rpc/*` batch calls, `/api/healthcheck`.

## Capabilities

### New Capabilities

None. Behaviour is unchanged; `.openspec.yaml` sets `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- `packages/api/**` created (~4,500 lines moved, ~60 files).
- `apps/website/src/**`: roughly 54 files change import lines only; `rpc.$.ts` and
  `lib/orpc/client.ts` add `messages` to the context they already build; `lib/env/server.ts`,
  `lib/file.ts`, `lib/utils.ts` (`SITE_NAME`), `i18n/better-auth.ts` become re-exports or are
  deleted in favour of the package path.
- Dependencies: `@repo/api` depends on `@repo/db`, `@repo/lib`, `@repo/cosmo`, `better-auth`,
  `@better-auth/i18n`, `@orpc/server`, `drizzle-orm`, `zod`, the three AWS SDK packages,
  `@t3-oss/env-core`, `ofetch`, `nanoid`, `slugify`; peer `@tanstack/react-start` (see
  design.md, decision 1). `apps/website` adds `@repo/api` and can drop the server-only deps
  that no remaining app file imports.
- Docker image for `website` is unaffected in behaviour; the pruned workspace grows by one
  package.
