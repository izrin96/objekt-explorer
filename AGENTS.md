# AGENTS.md

## Project Overview

Objekt Tracker - A web application for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc. Currently undergoing major refactoring from Next.js to TanStack React Start.

## Architecture

**Monorepo Structure** (Bun workspaces + Turbo):

- `apps/web` - Main frontend (Next.js)
- `apps/website` - Main frontend (TanStack React Start + Vite)
- `apps/server` - WebSocket activity server
- `apps/worker` - Background job worker (Croner)
- `apps/indexer` - NFT metadata indexer
- `packages/db` - Database schema (Drizzle ORM + PostgreSQL)
- `packages/lib` - Shared utilities
- `packages/cosmo` - Cosmo SDK (from teamreflex/cosmo-web)
- `packages/env` - Environment variables

**Key Technologies**:

- Runtime: Bun
- Frontend: Next.js, TanStack React Start, React 19, Tailwind CSS 4
- API: ORPC (type-safe RPC) with Zod validation
- Database: PostgreSQL 18 with Drizzle ORM
- State: React Query (server), Zustand (client)
- Real-time: Redis pub-sub, WebSockets

**Database Schema** (`packages/db/src/schema/`):

- Uses `citext` for case-insensitive fields
- Relations defined with Drizzle relations
- Key tables: user, user_address, lists, profile_list, pins, locked_objekts

## Code Style

- Formatter: oxfmt (configured in `.oxfmtrc.json`)
- Linter: oxlint (configured in `.oxlintrc.json`)
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `src/`

<!-- intent-skills:start -->

# Skill mappings - when working in these areas, load the linked skill file into context.

skills:

- task: "Route definitions, loaders, navigation, search/path params, not-found handling"
  load: "node_modules/.bun/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/SKILL.md"
- task: "Server functions (createServerFn), input validation, server context"
  load: "node_modules/.bun/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/server-functions/SKILL.md"
- task: "Server middleware, request context, client-server data passing"
  load: "node_modules/.bun/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/middleware/SKILL.md"
- task: "Route protection, auth guards, authenticated layouts, RBAC"
  load: "node_modules/.bun/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/auth-and-guards/SKILL.md"
- task: "SSR, streaming, head/meta management, document shell"
  load: "node_modules/.bun/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/ssr/SKILL.md"
- task: "Deployment, prerendering, SPA mode, platform config"
  load: "node_modules/.bun/@tanstack+start-client-core@1.167.2/node_modules/@tanstack/start-client-core/skills/start-core/deployment/SKILL.md"
- task: "UI components, shadcn theming, component styling"
load: "node_modules/.bun/@tanstack+router-core@1.168.2/node_modules/@tanstack/router-core/skills/router-core/SKILL.md"
<!-- intent-skills:end -->
