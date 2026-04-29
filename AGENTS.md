# AGENTS.md

## Project Overview

Objekt Tracker - A web application for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

## Architecture

**Monorepo Structure** (Bun workspaces + Turbo):

- `apps/web` - Main frontend (Next.js) (Deprecated)
- `apps/website` - Main frontend (TanStack React Start + Vite)
- `apps/server` - WebSocket activity server
- `apps/worker` - Background job worker (Croner)
- `apps/indexer` - NFT metadata indexer
- `packages/db` - Database schema (Drizzle ORM + PostgreSQL)
- `packages/lib` - Shared utilities
- `packages/cosmo` - Cosmo SDK (from teamreflex/cosmo-web)
- `packages/lint` - Shared oxlint configuration
- `packages/tsconfig` - Shared TypeScript configurations

**Key Technologies**:

- Runtime: Bun 1.3.11
- Frontend: Next.js 16, TanStack React Start + Vite, React 19, Tailwind CSS 4
- API: ORPC (type-safe RPC) with Zod validation
- Database: PostgreSQL 18 with Drizzle ORM
- State: React Query (server), Zustand (client)
- Real-time: Redis pub-sub, WebSockets

**Database Schema** (`packages/db/src/schema/`):

- Uses `citext` for case-insensitive fields
- Relations defined with Drizzle relations
- Key tables: user, user_address, lists, profile_list, pins, locked_objekts

## Development Commands

All commands should be run from the monorepo root using Turbo:

```bash
# Development
bun run dev                    # Start all dev servers
bun run dev --filter=web       # Start specific app

# Build
bun run build                  # Build all packages and apps
bun run build --filter=web     # Build specific app

# Linting
bun run lint                   # Lint all packages (oxlint)
bun run lint --filter=web      # Lint specific app
bun run lint:fix               # Lint and auto-fix

# Type Checking
bun run typecheck              # Type check all packages
bun run typecheck --filter=web # Type check specific app

# Formatting
bun run format                 # Format all code (oxfmt)
```

## Linting (Oxlint)

- Base config: `packages/lint/oxlint.config.ts`
- Each app/package has its own `oxlint.config.ts` extending the base
- Config uses `extends: [baseConfig]` pattern (not spread)

## TypeScript Configuration

- Base configs: `packages/tsconfig/`
  - `tsconfig.base.json` - Default for packages (bundler resolution)
  - `tsconfig.bun.json` - For Bun-based apps (includes JSX, Bun types)
  - `tsconfig.node.json` - For strict Node.js ESM projects (NodeNext resolution)
- All tsconfigs have explicit `include` and `exclude` fields
- Module resolution: `bundler` (not `NodeNext`) — no `.js` extensions needed on imports

## Code Style

Enforced by oxlint, oxfmt, and TypeScript config. Follow strictly.

- Formatter: oxfmt (configured in `.oxfmtrc.json`)
- Linter: oxlint (configured in `packages/lint/oxlint.config.ts`)
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `src/`
- `import * as z from "zod"`, never `import { z } from "zod"`
- All promises must be awaited or explicitly voided
- Avoid classes (use functions/objects) and enums (use `as const` or unions)
- 2-space indent, oxfmt handles formatting — do not add Prettier or Biome
- while using tailwing, prefer sizes in tw units like `-5` rather than in pixels via `-[20px]`
- while using Zod, prefer not duplicate types, just infer them from schemas

## Behavior

- Never `git commit`, `git push`, or run database migrations without explicit approval or being asked
- never edit past migrations, only way is generating new one

## Skill Loading

Before substantial work:

- Skill check: run `npx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

# Skill mappings - load `use` with `npx @tanstack/intent@latest load <use>`.

skills:

- when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
  use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
- when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
  use: "@tanstack/react-start#react-start"
- when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
  use: "@tanstack/react-start#react-start/server-components"
- when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
  use: "@tanstack/router-core#router-core"
- when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (\_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  use: "@tanstack/router-core#router-core/auth-and-guards"
- when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  use: "@tanstack/router-core#router-core/code-splitting"
- when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  use: "@tanstack/router-core#router-core/data-loading"
- when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  use: "@tanstack/router-core#router-core/navigation"
- when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  use: "@tanstack/router-core#router-core/not-found-and-errors"
- when: "Dynamic path segments ($paramName), splat routes ($ / \_splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  use: "@tanstack/router-core#router-core/path-params"
- when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  use: "@tanstack/router-core#router-core/search-params"
- when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  use: "@tanstack/router-core#router-core/ssr"
- when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
  use: "@tanstack/router-core#router-core/type-safety"
- when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
  use: "@tanstack/router-plugin#router-plugin"
- when: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
  use: "@tanstack/start-client-core#start-core"
- when: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
  use: "@tanstack/start-client-core#start-core/deployment"
- when: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE\_ prefix, process.env)."
  use: "@tanstack/start-client-core#start-core/execution-model"
- when: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
  use: "@tanstack/start-client-core#start-core/middleware"
- when: "createServerFn (GET/POST), inputValidator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
  use: "@tanstack/start-client-core#start-core/server-functions"
- when: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
  use: "@tanstack/start-client-core#start-core/server-routes"
- when: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
  use: "@tanstack/start-server-core#start-server-core"
- when: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
  use: "@tanstack/virtual-file-routes#virtual-file-routes"

## Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
