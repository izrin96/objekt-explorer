# AGENTS.md

## Project

**Objekt Explorer** — web app for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

## Monorepo Structure

| Path                | Name             | Purpose                                                                             |
| ------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `apps/website`      | `website`        | Main frontend (TanStack React Start + Vite) with embedded WebSocket activity server |
| `apps/worker`       | `worker`         | Background job worker (Croner)                                                      |
| `apps/indexer`      | `indexer`        | NFT metadata indexer (Subsquid)                                                     |
| `packages/db`       | `@repo/db`       | Database schema (Drizzle ORM + PostgreSQL)                                          |
| `packages/lib`      | `@repo/lib`      | Shared utilities                                                                    |
| `packages/cosmo`    | `@repo/cosmo`    | Cosmo SDK                                                                           |
| `packages/lint`     | `@repo/lint`     | Shared oxlint config                                                                |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configs                                                           |

**Workspace manager:** Bun workspaces + Turbo. Package names match directory names (e.g. filter with `--filter=website`).

## Tech Stack

| Category    | Technology                                           |
| ----------- | ---------------------------------------------------- |
| Runtime     | Bun 1.4, TypeScript 7 (strict)                       |
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

App schema lives in `packages/db/src/schema.ts` (plus `auth-schema.ts` and `relation.ts`); the indexer's read-only NFT schema lives in `packages/db/src/indexer/`. Uses `citext` for case-insensitive fields. Relations defined via Drizzle relations. Migrations: `packages/db/migrations` and `packages/db/indexer-migrations`.

Shared dependency versions are pinned in the root `package.json` bun **catalog** — new packages should use `"catalog:"` / `"catalog:dev"` rather than repeating a version.

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

Database tasks live in `@repo/db` and are run with bun's workspace filter, not Turbo:

```bash
bun run --filter=@repo/db db:generate   # Generate migration from schema
bun run --filter=@repo/db db:migrate    # Apply migrations (needs approval)
bun run --filter=@repo/db db:push       # Push schema directly (needs approval)
bun run --filter=@repo/db db:studio     # Drizzle Studio
```

There is no test framework in this repo — `lint` + `typecheck` are the checks.

## Code Style

Enforced by oxlint (`packages/lint/oxlint.config.ts`) and oxfmt (`oxfmt.config.ts`). TS strict mode is on. Module resolution: `bundler` (no `.js` extensions on imports).

Every package extends the shared oxlint baseline from its own config file (`oxlint.config.ts` in apps that set `"type": "module"`, `oxlint.config.mts` elsewhere) and depends on `@repo/lint`. A new package needs both, otherwise oxlint silently falls back to its built-in defaults. The baseline sets `categories.correctness: "error"`, so correctness violations fail CI; everything else is a warning. The react-compiler rules (`set-state-in-effect`, `refs`, `incompatible-library`) are deliberately kept at `warn` while the existing violations in `apps/website` are worked through.

- Path alias: `@/*` → `src/`
- `import * as z from "zod"` — never `import { z }` (convention only; oxlint's `no-restricted-imports` cannot tell the two apart)
- Prefer TS type inference from Zod schemas over manual type declarations
- Await all promises or explicitly void them
- Avoid `class` and `enum` — use functions/objects and `as const`/unions
- In Tailwind, prefer theme-based spacing (e.g. `p-2`) over arbitrary values (`p-[8px]`)
- oxfmt handles all formatting — do not add Prettier or Biome

## Environment

A single root `.env`, copied from `.env.example`, is shared by every app — package scripts load it with `--env-file=../../.env`. Key variables:

- `DATABASE_URL` — main PostgreSQL connection
- `INDEXER_DATABASE_URL` — indexer PostgreSQL connection
- `REDIS_URL` — Valkey (Redis-compatible) connection
- `BETTER_AUTH_SECRET` — auth encryption key
- `VITE_SITE_URL` — public site URL
- `COSMO_KEY` — encrypted API key for Cosmo SDK

Full list in `.env.example`.

`apps/website` compiles Paraglide messages before type-checking (`typecheck` runs `paraglide:compile` first), so `src/paraglide` is generated output — never edit it by hand. Same for `src/routeTree.gen.ts`.

## Docker

`docker-compose.yml` provides the full stack: website (port 3000), worker, indexer processor, two PostgreSQL instances each behind pgbouncer, and Valkey. S3 storage and mail are external services configured through `.env`.

## CI/CD

`.github/workflows/docker-ci.yml` — on push/PR to main: detects changed apps, runs lint+typecheck, builds Docker images for affected services.

## Behavior

- Never `git commit`, `git push`, or run DB migrations without explicit approval
- Never edit past migrations — always create new ones
- Only change what you're asked to change
