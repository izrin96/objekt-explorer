# AGENTS.md

## Project

**Objekt Tracker** — web app for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc.

## Monorepo Structure

| Path                | Name             | Purpose                                                                   |
| ------------------- | ---------------- | ------------------------------------------------------------------------- |
| `apps/web`          | `web`            | Main frontend (TanStack React Start + Vite, Base UI)                      |
| `apps/worker`       | `worker`         | Background job worker (`Bun.cron`)                                        |
| `apps/indexer`      | `indexer`        | NFT metadata indexer (Subsquid)                                           |
| `packages/api`      | `@repo/api`      | ORPC routers and services                                                 |
| `packages/db`       | `@repo/db`       | Database schema (Drizzle ORM + PostgreSQL)                                |
| `packages/lib`      | `@repo/lib`      | Shared utilities                                                          |
| `packages/cosmo`    | `@repo/cosmo`    | Cosmo SDK                                                                 |
| `packages/email`    | `@repo/email`    | Auth email templates (jsx-email), rendered to HTML and plain text for SES |
| `packages/lint`     | `@repo/lint`     | Shared oxlint config                                                      |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configs                                                 |

**Workspace manager:** Bun workspaces + Turbo. Package names match directory names (e.g. filter with `--filter=web`).

`apps/web`, `apps/worker`, `apps/indexer`, `packages/api` and `packages/db` each carry an `AGENTS.md` with the conventions and traps of that package (a `CLAUDE.md` beside it imports it). Read it before changing code there.

## Tech Stack

| Category    | Technology                                           |
| ----------- | ---------------------------------------------------- |
| Runtime     | Bun 1.4, TypeScript 7 (strict)                       |
| Frontend    | TanStack React Start, Vite, React 19, Tailwind CSS 4 |
| API         | ORPC (type-safe RPC) with Zod                        |
| Database    | PostgreSQL 18, Drizzle ORM                           |
| Auth        | Better Auth                                          |
| State       | React Query (server), Zustand (client)               |
| Real-time   | Centrifugo (self-hosted), centrifuge-js              |
| i18n        | Inlang (Paraglide)                                   |
| Lint/Format | oxlint, oxfmt                                        |
| Jobs        | `Bun.cron`                                           |
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
bun run test                       # Run tests (bun test)
bun run format                     # Format all (oxfmt)
```

Database tasks live in `@repo/db` and are run with bun's workspace filter, not Turbo:

```bash
bun run --filter=@repo/db db:generate   # Generate migration from schema
bun run --filter=@repo/db db:migrate    # Apply migrations (needs approval)
bun run --filter=@repo/db db:push       # Push schema directly (needs approval)
bun run --filter=@repo/db db:studio     # Drizzle Studio
```

The checks are `lint`, `typecheck` and `test`; `bun run check` runs all three, and CI runs each. Tests use `bun test`, sit beside the code as `*.test.ts`, and cover pure modules only: the root `.env` is production, so a test never touches the database, Redis or the Cosmo API. To test logic that lives in a hook or a job, move it into a module with no such imports (as `apps/worker/src/lib/serial-math.ts` and `apps/web/src/features/activity/live-feed.ts` do) and test that. `bun run knip` (config in `knip.json`) reports unused files, exports and dependencies. It is advisory, not a gate. Unused exports in the vendored `components/ui` files are ignored, since those files stay verbatim.

Hooks run the checks early. lefthook (`lefthook.yml`) formats and lints staged files on commit, each package's lint from its own directory, and runs `bun run check` on push. Claude Code's hooks (`.claude/settings.json`) format each edited file, lint the turn's changed files before it ends, and block database writes aimed at production.

## Skills and specs

`apps/web/src/components/ui/*` are vendored registry copies; `apps/web/src/components/ui/README.md` lists the only local edits and how to update them.

Skills live once under `.agents/skills/<name>` (agent-neutral) with `.claude/skills/<name>` a relative symlink to them, pinned in `skills-lock.json`, all committed so every worktree carries them. Third-party skills are advice, not authority: where one contradicts this file or a package `AGENTS.md`, the project document wins. The usual conflicts: commit only when the user asks, however often a skill says to commit; tests cover pure modules only, whatever `test-driven-development` asks of the rest; a "spec" is an OpenSpec change, never a `SPEC.md`. `using-agent-skills` routes a task to a skill; skills it names that are not installed here do not apply. Invoke the one for the layer being touched:

| Layer or task                                       | Skills                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Routes, loaders, `validateSearch`                   | `router-core`, `tanstack-router-best-practices`                                               |
| Server functions, SSR, entry points                 | `start-core`, `tanstack-start-best-practices`                                                 |
| React components                                    | `vercel-react-best-practices`, `vercel-composition-patterns`                                  |
| Writing new UI code                                 | `frontend-ui-engineering`                                                                     |
| ORPC procedures, module boundaries, shared types    | `api-and-interface-design`                                                                    |
| Better Auth server and client                       | `better-auth-best-practices`; `email-and-password-best-practices` for sign-in and passwords   |
| Drizzle schema, raw SQL, indexes                    | `supabase-postgres-best-practices` (Postgres anywhere)                                        |
| Bun APIs, `bun test`, `Bun.cron`                    | `bun-runtime`                                                                                 |
| A library API you have not checked this session     | `source-driven-development`, fetching docs through `ctx7`                                     |
| A change touching more than one file                | `incremental-implementation`, with `test-driven-development` for pure logic                   |
| Reviewing or polishing a screen or flow             | `better-interface`, which loads the six `better-*` domain skills itself                       |
| One UI domain, or a targeted fix                    | that domain's `better-*` skill alone; `fixing-accessibility` for a one-file accessibility fix |
| Colour tokens, contrast, light/dark tints           | `oklch-skill`                                                                                 |
| Checking a change in the running app                | `browser-testing-with-devtools`                                                               |
| Something broken, slow or throwing                  | `debugging-and-error-recovery` first                                                          |
| Reviewing a branch or a change                      | `code-review-and-quality`; `interface-review` for its UI                                      |
| Code that works but reads badly                     | `code-simplification`                                                                         |
| Auth, user input, sessions, third-party calls       | `security-and-hardening`; the `security-auditor` agent for a full audit                       |
| Core Web Vitals, slow queries, bundle size          | `performance-optimization`; the `web-performance-auditor` agent for a full audit              |
| Branches, commit messages, splitting work           | `git-workflow-and-versioning`                                                                 |
| Recording a decision or its reasoning               | `documentation-and-adrs`                                                                      |
| Passing work to another agent or session            | `handoff`                                                                                     |
| Parallel work across agents or worktrees            | `orchestration` to supervise Orca workers; `orca-cli` to hand off a whole worktree            |
| A merge conflict                                    | `resolving-merge-conflicts` (`routeTree.gen.ts`, `paraglide/` are regenerated, never merged)  |
| Editing this file, a skill, an agent or `openspec/` | `writing-for-agents`                                                                          |

`better-interface` loads `better-accessibility`, `better-layout`, `better-writing`, `better-typography`, `better-colors` and `better-ui` itself, so invoke it on its own; it reports without editing unless you also ask for the fixes. `better-accessibility` owns the accessibility rules the review applies, and `fixing-accessibility` stays the one-file fixer.

The `addyosmani/agent-skills` skills read their checklists from `.agents/references/` (security, performance, accessibility, testing, definition of done) and the two agents in `.claude/agents/` from there too. `skills-lock.json` does not track those files: refresh them from that repository's `references/` by hand.

Install a new skill with `npx skills@latest add <owner/repo> -s <skill> -a claude-code -y`, read the whole skill, move the directory to `.agents/skills/` and replace it with the symlink, then commit it with `skills-lock.json`. `npx skills@latest update -p -y` refreshes them all; it warns that `resolving-merge-conflicts` was deleted upstream, and the local copy stays.

Specs use OpenSpec, for a change to behaviour that a spec under `openspec/specs/` describes or that spans features: `/opsx:propose` → review the change under `openspec/changes/` → `/opsx:apply` → `/opsx:archive`. A fix or a change inside one feature goes straight in, through `incremental-implementation`. `openspec/config.yaml` carries the project context every change is written against. The `openspec-*` skills and `opsx` commands under `.claude/` are `openspec update` output — regenerate them, never edit or symlink them.

Worktrees come from Orca: `orca.yaml` runs `scripts/setup-worktree.sh` in each new one, which copies the main checkout's `.env` and `.env.local`, runs `bun install` and installs the git hooks. Any other git worktree gets none of that until the script runs in it; the script assumes nothing about Orca.

## Code Style

Enforced by oxlint (`packages/lint/oxlint.config.ts`) and oxfmt (`oxfmt.config.ts`). TS strict mode is on. Module resolution: `bundler` (no `.js` extensions on imports).

Every package extends the shared oxlint baseline from its own config file (`oxlint.config.ts` in apps that set `"type": "module"`, `oxlint.config.mts` elsewhere) and depends on `@repo/lint`. A new package needs both, otherwise oxlint silently falls back to its built-in defaults. The baseline sets `categories.correctness: "error"`, so correctness violations fail CI; everything else is a warning. The React Compiler runs in `apps/web`, so `react/set-state-in-effect` and `react/refs` are errors; `react/incompatible-library` stays a warning, since the compiler only skips a component that uses such a library.

- Path alias: `@/*` → `src/`
- `import * as z from "zod"` — never `import { z }` (convention only; oxlint's `no-restricted-imports` cannot tell the two apart)
- Prefer TS type inference from Zod schemas over manual type declarations
- Await all promises or explicitly void them
- Avoid `class` and `enum` — use functions/objects and `as const`/unions
- In Tailwind, prefer theme-based spacing (e.g. `p-2`) over arbitrary values (`p-[8px]`)
- oxfmt handles all formatting — do not add Prettier or Biome

## Environment

A single root `.env`, copied from `.env.example`, is shared by every app. Package scripts load `--env-file=../../.env --env-file=../../.env.local`: an optional, gitignored root `.env.local` overrides it per variable, so a `DATABASE_URL` there keeps the dev servers and `db:*` scripts on a local database instead of production. Key variables:

- `DATABASE_URL` — main PostgreSQL connection
- `INDEXER_DATABASE_URL` — indexer PostgreSQL connection
- `REDIS_URL` — Valkey (Redis-compatible) connection: caches, rate limits, and the indexer's `transfers` channel
- `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_TOKEN_SECRET` — the real-time server: web and the worker publish through its server API, and browsers connect at `/connection` on the site's origin with a token from `realtime.token`. Locally these live in `.env.local`; never point a local Centrifugo at the Valkey in the root `.env`
- `BETTER_AUTH_SECRET` — auth encryption key
- `SITE_URL` — public origin, read at runtime: Better Auth's base URL and the only origin it accepts; the client uses the page's own origin, so no build bakes a domain in
- `COSMO_KEY` — encrypted API key for Cosmo SDK

Full list in `.env.example`.

`apps/web` compiles Paraglide messages before type-checking (`typecheck` runs `paraglide:compile` first), so `src/paraglide` is generated output — never edit it by hand. Same for `src/routeTree.gen.ts`.

## Docker

`docker-compose.yml` provides the full stack: web (port 3000, built from `apps/web/Dockerfile`), worker, indexer processor, two PostgreSQL instances each behind pgbouncer, Valkey, and Centrifugo (`centrifugo/config.json`; reachable only on the Docker network, with `/connection` routed to it by the reverse proxy, see `design/realtime-centrifugo-deploy.md`). Locally, `docker compose --env-file .env --env-file .env.local up -d centrifugo` also applies `docker-compose.override.yml`, which publishes it on `127.0.0.1:8000` for the dev server's `/connection` proxy. S3 storage and mail are external services configured through `.env`.

## CI/CD

`.github/workflows/docker-ci.yml` — on push/PR to main: detects changed apps, runs the format check, lint, typecheck and the web production build, then builds Docker images for affected services. The `web` image is built from `apps/web`.

## Behavior

- Never `git commit`, `git push`, or run DB migrations without explicit approval
- Never edit past migrations — always create new ones
- Only change what you're asked to change
