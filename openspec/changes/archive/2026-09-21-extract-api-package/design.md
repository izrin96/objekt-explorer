## Context

See proposal.md — Why. The server layer is 4,477 lines under `apps/website/src/lib/{server,universal,env}`.
Its external imports are all workspace packages or server libraries, with four exceptions
that tie it to the app: `@tanstack/react-start/server` request helpers in `orpc.ts`,
`auth.server.ts`, `cookie.server.ts` and `routers/config.ts`; `@/paraglide/messages` in four
routers; `@/paraglide/runtime` and `@/i18n/better-auth` in the Better Auth config; `@/lib/file`
and `@/lib/utils` constants. Fan-in from app code is 54 files, dominated by `universal/*`
type imports (46) and `auth.server` (6).

`packages/lib` is the model for a workspace package: `exports` map to `src/*.ts`, no build
step, `oxlint.config.mts` extending `@repo/lint`, `tsconfig.json` extending the shared base.
Both consumers of the new package (`website`, the coming `web`) are TanStack Start apps.

## Goals / Non-Goals

**Goals:**

- A move whose diff in `apps/website` is import lines plus the two context-building files.
- No new abstraction beyond what cutting the four couplings requires.
- `web` can later import routers, services, schemas and the WebSocket server without touching `website`.

**Non-Goals:**

- Making `@repo/api` runnable outside a TanStack Start server (see decision 1).
- Reorganising router internals or splitting `list.server.ts`.

## Decisions

**1. `@repo/api` keeps `@tanstack/react-start/server` as a peer dependency.**
The request helpers (`getRequestHeaders`, `setResponseHeader`, `getCookie`, `setCookie`) are
plain runtime imports backed by Start's request context; nothing in them needs the Vite
plugin's compile step. Keeping them means `orpc.ts`, `auth.server.ts`, `cookie.server.ts` and
`config.ts` move unchanged. Alternatives: (a) thread `headers`/response headers explicitly
through every service — touches `getSession` and its six callers plus `privacy.server`, a
large diff for a package whose only consumers are Start apps; (b) an adapter singleton the
app configures at boot — a new indirection with a start-up ordering hazard. Both can be
introduced later if a non-Start consumer ever appears; neither is needed now. This revises
the line in `design/web-migration-plan.md` § 1 that said the package must not depend on Start.

**2. Localised error strings are injected, not compiled, in the package.**
`@repo/api` exports `type ApiMessages = { [K in ApiErrorKey]: (...) => string }` covering the
13 `api_errors_*` keys, and the ORPC initial context becomes `{ headers?: Headers; messages: ApiMessages }`.
Routers read `context.messages.compare_source_list_not_found()` and so on. Each app builds the
record once from its own Paraglide `m` and passes it from `rpc.$.ts` and the server branch of
`lib/orpc/client.ts`. Paraglide message functions read the active locale at call time, so a
module-level record stays locale-correct per request. Alternatives: a second inlang project
inside the package (duplicates translations and the compile step); returning error codes and
localising on the client (changes what `website` displays today).

**3. Better Auth locale comes from cookie detection.**
The i18n plugin already lists `detection: ["callback", "cookie"]` with `localeCookie: "PARAGLIDE_LOCALE"`
and `defaultLocale: "en"`. Paraglide's strategy is `["cookie", "baseLocale"]` with base `en`,
so dropping the `getLocale` callback yields the same locale for every request. `betterAuthLocale`
moves to `packages/api/src/services/auth-locale.ts` because only the auth config reads it.

**4. Layout inside `packages/api/src`.**

| Source (`apps/website/src/lib`)                 | Destination                                   | Export path                     |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------- |
| `server/api/orpc.ts`                            | `orpc.ts` (`pub`, `authed`, `optionalAuthed`, `selectedArtistsMiddleware`, `ApiMessages`) | `@repo/api/orpc` |
| `server/api/routers/*.ts`                       | `routers/*.ts`; `routers/index.ts` exports `router` and the `Inputs`/`Outputs`/context types from `lib/orpc/server.ts` | `@repo/api` |
| `server/*.server.ts`, `query-logger.ts`, `currency-rates.ts`, `utils.server.ts` | `services/<name>.ts` (drop the `.server` suffix; the package is server-only) | `@repo/api/services/*` |
| `server/activity-websocket.server.ts`           | `activity.ts`                                 | `@repo/api/activity`            |
| `universal/*.ts`                                | `schemas/*.ts`                                | `@repo/api/schemas/*`           |
| `env/server.ts`                                 | `env.ts`                                      | `@repo/api/env`                 |
| `i18n/better-auth.ts`, `SITE_NAME`, `MAX_FILE_SIZE` | `services/auth-locale.ts`, `constants.ts` | `@repo/api/constants`           |

`package.json` `exports`: `".": "./src/routers/index.ts"`, `"./*": "./src/*.ts"`,
`"./services/*": "./src/services/*.ts"`, `"./schemas/*": "./src/schemas/*.ts"`.
`tsconfig.json` extends `@repo/tsconfig/tsconfig.bun.json` (the code uses `Bun.RedisClient`,
`ServerWebSocket`). `oxlint.config.mts` mirrors `packages/lib`.

**5. What stays in `apps/website`.** `lib/functions/*` and `lib/server/middleware.ts` use
`createServerFn` / `createMiddleware`, which the Start Vite plugin rewrites at build time and
only inside the app's source root. `lib/orpc/client.ts` uses `createIsomorphicFn`, same
reason. `server.ts`, `dev-websocket.ts` and every `routes/**` handler are entry points.
`lib/env/client.ts` is Vite-inlined client env. `lib/file.ts` and `lib/utils.ts` keep their
names and re-export the moved constants so component imports do not churn.

**6. `universal/current-user.ts` imports a type from `auth.server`.** It moves with the rest
to `schemas/current-user.ts` importing from `../services/auth`. No cycle: `services/auth`
imports `schemas/user` and `schemas/current-user` only as types.

## Risks / Trade-offs

- [Start peer dependency resolves to two module instances, breaking the ALS-backed helpers] →
  Bun workspaces hoist one copy; `bun pm ls @tanstack/react-start` must list a single version
  after install. The smoke check (sign in, refresh, `/rpc` batch) exercises the path.
- [`ssr.noExternal: true` in the website build bundles the package and its AWS SDK imports
  differently from today] → today those files are already bundled from `src/`; the only change
  is the path. `bun run build --filter=website` plus `bun run start:preview` hitting
  `/api/healthcheck` proves it.
- [Locale regression in Better Auth error messages after dropping `getLocale`] → set the
  `PARAGLIDE_LOCALE=ko` cookie and trigger a wrong-password sign-in; the message must be Korean.
- [oxlint `no-restricted-imports` or import-order rules flag the new `@repo/api` paths] → the
  baseline treats `@repo/*` as external; `bun run lint --filter=website` and `--filter=@repo/api`
  at 0 errors is the gate.
- [The move is large enough that a worker "improves" code on the way] → the brief forbids edits
  inside moved files beyond the four couplings; `git diff -M --stat` must show renames with
  near-100 % similarity for everything except `orpc.ts`, `auth.ts`, the four routers and the
  two context files.

## Migration Plan

Single deploy; no data or schema change. Rollback is `git revert` of the one commit. During
the overlap `web` (C1+) depends on `@repo/api`; `website` is deleted at cutover (C8) without
touching the package.
