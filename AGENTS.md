# AGENTS.md

## Project

**Objekt Explorer** — web app for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

## Monorepo Structure

| Path                | Name             | Purpose                                                                                      |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `apps/web`          | `web`            | Main frontend (TanStack React Start + Vite, Base UI) with embedded WebSocket activity server |
| `apps/website`      | `website`        | Legacy frontend, kept read-only as the behaviour reference until its removal; not deployed   |
| `apps/worker`       | `worker`         | Background job worker (Croner)                                                               |
| `apps/indexer`      | `indexer`        | NFT metadata indexer (Subsquid)                                                              |
| `packages/db`       | `@repo/db`       | Database schema (Drizzle ORM + PostgreSQL)                                                   |
| `packages/lib`      | `@repo/lib`      | Shared utilities                                                                             |
| `packages/cosmo`    | `@repo/cosmo`    | Cosmo SDK                                                                                    |
| `packages/lint`     | `@repo/lint`     | Shared oxlint config                                                                         |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configs                                                                    |

**Workspace manager:** Bun workspaces + Turbo. Package names match directory names (e.g. filter with `--filter=web`).

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
bun run dev --filter=web           # Start specific app
bun run build                      # Build all
bun run build --filter=web         # Build specific app
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

There is no test framework in this repo — `lint` + `typecheck` are the checks. `bun run check` runs both. `bun run knip` (config in `knip.json`) reports unused files, exports and dependencies; it is advisory today because `apps/website` carries pre-existing findings, and becomes a gate once `apps/website` and `intentui/` are deleted.

## Skills and specs

`apps/web/src/components/ui/*` are vendored registry copies; `apps/web/src/components/ui/README.md` lists the only local edits and how to update them.

Skills live once under `.agents/skills/<name>` (agent-neutral) with `.claude/skills/<name>` a relative symlink to them, pinned in `skills-lock.json`, all committed so a worktree or a Superset workspace carries them. Third-party skills are advice, not authority: where one contradicts this file or `design/lab-code-review.md`, the project document wins. Invoke the one for the layer being touched:

| Layer or task                             | Skills                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Routes, loaders, `validateSearch`         | `router-core`, `tanstack-router-best-practices`                                              |
| Server functions, SSR, entry points       | `start-core`, `tanstack-start-best-practices`                                                |
| React components                          | `vercel-react-best-practices`, `vercel-composition-patterns`                                 |
| Better Auth server and client             | `better-auth-best-practices`                                                                 |
| Drizzle schema, raw SQL, indexes          | `supabase-postgres-best-practices` (Postgres anywhere)                                       |
| Reviewing or polishing a screen or flow   | `better-interface`, which loads the six `better-*` domain skills itself                      |
| One UI domain, or a targeted fix          | that domain's `better-*` skill alone; `fixing-accessibility` or `web-design-guidelines`      |
| Writing new UI code                       | `baseline-ui`                                                                                |
| Colour tokens, contrast, light/dark tints | `oklch-skill`                                                                                |
| Something broken, slow or throwing        | `diagnosing-bugs` first                                                                      |
| Reviewing a branch or a change            | `code-review`                                                                                |
| A merge conflict                          | `resolving-merge-conflicts` (`routeTree.gen.ts`, `paraglide/` are regenerated, never merged) |
| Editing this file, a skill or `openspec/` | `writing-for-agents`                                                                         |

`better-interface` loads `better-accessibility`, `better-layout`, `better-writing`, `better-typography`, `better-colors` and `better-ui` itself, so invoke it on its own; it reports without editing unless you also ask for the fixes. `better-accessibility` owns the accessibility rules the review applies, and `fixing-accessibility` stays the one-file fixer.

Install a new one with `npx skills@latest add <owner/repo> -s <skill> -a claude-code -y`, read the whole skill, move the directory to `.agents/skills/` and replace it with the symlink, then commit it with `skills-lock.json`.

Specs use OpenSpec: `/opsx:propose` → review the change under `openspec/changes/` → `/opsx:apply` → `/opsx:archive`. `openspec/config.yaml` carries the project context every change is written against. The `openspec-*` skills and `opsx` commands under `.claude/` are `openspec init --tools claude` output — regenerate them, never edit or symlink them. The Base UI migration is worked as one change per slice.

Superset workspaces are git worktrees; `.superset/setup.sh` copies the root `.env` from the main checkout and runs `bun install`, and `run` starts the lab and web dev servers.

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
- `SITE_URL` — public origin, read at runtime: Better Auth's base URL and the only origin it accepts; the client uses the page's own origin, so no build bakes a domain in
- `COSMO_KEY` — encrypted API key for Cosmo SDK

Full list in `.env.example`.

`apps/web` (and `apps/website`) compile Paraglide messages before type-checking (`typecheck` runs `paraglide:compile` first), so `src/paraglide` is generated output — never edit it by hand. Same for `src/routeTree.gen.ts`.

## Docker

`docker-compose.yml` provides the full stack: web (port 3000, built from `apps/web/Dockerfile`), worker, indexer processor, two PostgreSQL instances each behind pgbouncer, and Valkey. S3 storage and mail are external services configured through `.env`. `apps/website` has no service or image.

## CI/CD

`.github/workflows/docker-ci.yml` — on push/PR to main: detects changed apps, runs the format check, lint, typecheck and the web production build, then builds Docker images for affected services. The `web` image is built from `apps/web`; a change under `apps/website` only triggers lint and typecheck.

## Behavior

- Never `git commit`, `git push`, or run DB migrations without explicit approval
- Never edit past migrations — always create new ones
- Only change what you're asked to change
