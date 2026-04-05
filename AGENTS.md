# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Objekt Tracker - A web application for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

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

## Code Style

- Formatter: oxfmt (configured in `.oxfmtrc.json`)
- Linter: oxlint (configured in `packages/lint/oxlint.config.ts`)
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `src/`

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

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
