# AGENTS.md

## Project

**Objekt Explorer** — web app for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

## Monorepo Structure

| Path                | Name             | Purpose                                     |
| ------------------- | ---------------- | ------------------------------------------- |
| `apps/website`      | `website`        | Main frontend (TanStack React Start + Vite) |
| `apps/server`       | `server`         | WebSocket activity server                   |
| `apps/worker`       | `worker`         | Background job worker (Croner)              |
| `apps/indexer`      | `indexer`        | NFT metadata indexer (Subsquid)             |
| `packages/db`       | `@repo/db`       | Database schema (Drizzle ORM + PostgreSQL)  |
| `packages/lib`      | `@repo/lib`      | Shared utilities                            |
| `packages/cosmo`    | `@repo/cosmo`    | Cosmo SDK                                   |
| `packages/lint`     | `@repo/lint`     | Shared oxlint config                        |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configs                   |

**Workspace manager:** Bun workspaces + Turbo. Package names match directory names (e.g. filter with `--filter=website`).

## Tech Stack

| Category    | Technology                                           |
| ----------- | ---------------------------------------------------- |
| Runtime     | Bun 1.3                                              |
| Frontend    | TanStack React Start, Vite, React 19, Tailwind CSS 4 |
| API         | ORPC (type-safe RPC) with Zod                        |
| Database    | PostgreSQL 18, Drizzle ORM                           |
| Auth        | Better Auth                                          |
| State       | React Query (server), Zustand (client)               |
| Real-time   | WebSockets, Valkey pub-sub                           |
| i18n        | Inlang (Paraglide)                                   |
| Lint/Format | oxlint, oxfmt                                        |
| Jobs        | Croner                                               |
| Indexer     | Subsquid (EVM processor)                             |

Schema lives in `packages/db/src/schema/`. Uses `citext` for case-insensitive fields. Relations defined via Drizzle relations.

## Commands

All run from monorepo root via Turbo. Filters use package name:

```bash
bun run dev                        # Start all dev servers
bun run dev --filter=website       # Start specific app
bun run build                      # Build all
bun run build --filter=website     # Build specific app
bun run lint                       # Lint all (oxlint)
bun run lint:fix                   # Lint and auto-fix
bun run typecheck                  # Type-check all
bun run format                     # Format all (oxfmt)
```

## Code Style

Enforced by oxlint (`packages/lint/oxlint.config.ts`) and oxfmt (`oxfmt.config.ts`). TS strict mode is on. Module resolution: `bundler` (no `.js` extensions on imports).

- Path alias: `@/*` → `src/`
- `import * as z from "zod"` — never `import { z }`
- Prefer TS type inference from Zod schemas over manual type declarations
- Await all promises or explicitly void them
- Avoid `class` and `enum` — use functions/objects and `as const`/unions
- In Tailwind, prefer theme-based spacing (e.g. `p-2`) over arbitrary values (`p-[8px]`)
- oxfmt handles all formatting — do not add Prettier or Biome

## Environment

Set up by copying `.env.example` → `.env`. Key variables:

- `DATABASE_URL` — main PostgreSQL connection
- `INDEXER_DATABASE_URL` — indexer PostgreSQL connection
- `REDIS_URL` — Valkey (Redis-compatible) connection
- `BETTER_AUTH_SECRET` — auth encryption key
- `VITE_SITE_URL` — public site URL
- `COSMO_KEY` — encrypted API key for Cosmo SDK

Full list in `.env.example`.

## Docker

`docker-compose.yml` provides the full stack: website, server, worker, processor, PostgreSQL, Valkey, S3-compatible storage (rustfs), and connection pooling (pgbouncer).

## CI/CD

`.github/workflows/docker-ci.yml` — on push/PR to main: detects changed apps, runs lint+typecheck, builds Docker images for affected services.

## Behavior

- Never `git commit`, `git push`, or run DB migrations without explicit approval
- Never edit past migrations — always create new ones
- Only change what you're asked to change
