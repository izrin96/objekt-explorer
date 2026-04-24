# AGENTS.md

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

## Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

## Skill Loading

Before substantial work:

- Skill check: run `npx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
