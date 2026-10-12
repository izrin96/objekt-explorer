# `apps/web` — wiring the lab prototype into a real app

Status: approved with defaults 2026-09-21 (§ 5). C0 and C1 are proposed under `openspec/changes/`; nothing is dispatched yet.

`apps/lab` is the finished visual and behavioural reference (36 rounds, findings in
`base-ui-prototype-findings.md`, port notes in `lab-code-review.md` § "What the website
port should watch for"). `apps/website` is the behavioural and server reference. Neither
is edited by this programme except where a change below says so. The result is a third
app, `apps/web`, on the same stack as `website` (TanStack React Start, React 19, Tailwind 4,
ORPC, React Query, Zustand, Paraglide) with the lab's Base UI components and a structure
that separates the server layer, the UI kit, and feature code.

## 1. Target shape

### `packages/api` (`@repo/api`) — the server layer, shared by `website` and `web`

Moved out of `apps/website/src/lib` so both apps run the same code during the overlap
and `web` never re-implements a query.

| From `apps/website/src/lib`            | To `packages/api/src`                                            |
| -------------------------------------- | ---------------------------------------------------------------- |
| `server/api/orpc.ts`, `server/api/routers/**` | `orpc.ts` (middleware + `ApiMessages`), `routers/**` (`routers/index.ts` exports `router` and its inferred types) |
| `server/*.server.ts`, `server/query-logger.ts`, `server/currency-rates.ts` | `services/*.ts` (auth, redis, s3, mail, token, objekt, list, privacy, rarity, artist, cookie) |
| `server/activity-websocket.server.ts` | `activity.ts` (`dev-websocket.ts` and `server.ts` stay in each app as entry points) |
| `universal/*.ts`                        | `schemas/*.ts` (zod schemas + inferred types used on both sides) |
| `env/server.ts`                         | `env.ts`                                                         |

Stays in each app: `lib/functions/*` (`createServerFn` wrappers are compiled by the app's
Start plugin, so they stay thin and app-local and call `@repo/api` services), `env/client.ts`,
the `rpc.$.ts` / `api/*` route handlers, `auth-client.ts`.

Two design decisions inside this change (detail in `openspec/changes/extract-api-package/design.md`):
the package keeps `@tanstack/react-start/server` as a peer dependency, because both consumers
are Start apps and the request helpers are plain runtime imports, so the four files using
them move unchanged; and the 13 localised `api_errors_*` strings become an `ApiMessages`
record each app passes in the ORPC initial context, so the package has no Paraglide
dependency. `packages/api` depends on `@repo/db`, `@repo/lib`, `@repo/cosmo`, `better-auth`,
`@orpc/server`, the AWS SDKs and Bun's Redis client as today; it does not depend on React.

### `apps/web` — file-based Start app, port 3200 in dev

```
apps/web/
  package.json            name "web"; dev on 3200 so lab (3100) and website (3000) still run
  vite.config.ts          tanstackStart + tailwind + paraglide + react compiler; chunk group "base-ui"
  project.inlang, messages/en.json   copied from website, pruned to keys web uses
  oxlint.config.ts, tsconfig.json    extend @repo/lint, @repo/tsconfig (same as website)
  src/
    router.tsx, server.ts, client.tsx, routeTree.gen.ts (generated)
    routes/               same URL surface as website: __root, (container)/*, @{$nickname}/*, api/*, rpc.$
    components/ui/        cnippet registry, verbatim from apps/lab; local fixes in one commented block
    components/shared/    page-header, empty-state, data-table, copy-button, time-ago (from lab)
    components/layout/    app-nav, mobile-nav, nav-search, user-menu, system-status, theme
    components/router/    error, not-found, pending components
    features/<domain>/    objekt, filters, profile, list, compare, live, link, auth, account, market, activity, home
                          each: components/, hooks/, queries.ts (orpc + react-query options), and a store only if the domain owns one
    stores/               cross-feature zustand stores (session, settings, selection, snapshot); selectors only
    lib/                  utils, objekt, color, address, time, a11y, orpc-client, query-client, env/client
    i18n/                 paraglide runtime glue
    styles/app.css        the lab token set, nothing else
```

Rules every worker follows in `apps/web` (they are also in `openspec/config.yaml`):

- Zustand reads are selectors: `useFilters((s) => s.member)`. Never whole-state reads.
- URL state is route `validateSearch` with zod. No `nuqs`.
- Every user-facing string is `m.*` from Paraglide. Reuse the website key when the string is the same.
- Server data is React Query through `@orpc/tanstack-query` utils; route loaders `ensureQueryData` what the first paint needs.
- No import from `apps/website`, `apps/lab`, `intentui`, or `react-aria-components`. Copy the file into `web`, do not reference it.
- Icons are Phosphor. Tokens are cnippet names only (`*-foreground`). Grids are `virtua`.
- Port notes 1–7 of `lab-code-review.md` are requirements, not advice.

## 2. Changes (one OpenSpec change each, one Superset worker each)

| ID | Change | Depends on | Scope (files the worker may touch) | Skills the worker invokes first |
| -- | ------ | ---------- | ---------------------------------- | -------------------------------- |
| C0 | `extract-api-package` | — | `packages/api/**`, `apps/website/src/**` (imports only, no behaviour change), root `package.json` catalog, `knip.json`, `turbo.json` if needed | `start-core`, `tanstack-start-best-practices`, `better-auth-best-practices`, `supabase-postgres-best-practices`, `turborepo` |
| C1 | `web-scaffold` | — | `apps/web/**`, `knip.json`, `.superset/config.json` (add `bun run dev --filter=web`) | `start-core`, `router-core`, `tanstack-start-best-practices`, `turborepo`, `baseline-ui` |
| C2 | `web-shell` | C0, C1 | `apps/web/**` | `router-core`, `tanstack-start-best-practices`, `better-auth-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns` |
| C3 | `web-objekt-and-filters` | C2 | `apps/web/src/features/{objekt,filters,home}/**`, `apps/web/src/routes/(container)/index.tsx`, `stores/selection.ts` | `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `baseline-ui`, `better-accessibility` |
| C4 | `web-market-activity` | C3 | `features/{market,activity}/**`, `routes/(container)/{market,activity}.tsx`, `routes/api/activity.ts` | `vercel-react-best-practices`, `tanstack-start-best-practices`, `baseline-ui` |
| C5 | `web-profile` | C3 | `features/profile/**`, `routes/@{$nickname}/**` (not `list.tsx`), `stores/snapshot.ts` | `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `better-accessibility`, `baseline-ui` |
| C6 | `web-lists-compare` | C3 | `features/{list,compare}/**`, `routes/(container)/list/**`, `routes/(container)/@{$nickname}_/**`, `routes/@{$nickname}/list.tsx` | `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `baseline-ui` |
| C7 | `web-auth-link-live` | C2 | `features/{auth,link,live,account}/**`, `routes/(container)/{login,auth,link,live,terms-privacy}*`, `routes/api/{auth,live-sessions,open-app}*` | `better-auth-best-practices`, `tanstack-start-best-practices`, `vercel-react-best-practices`, `baseline-ui` |
| R  | review gate, after each of C2–C7 | that change | read-only; writes `design/web-review-<id>.md` | `better-interface`, `web-design-guidelines`, `code-review` |
| C8 | `cutover` | C4–C7 + R all clear | `docker-compose.yml`, `.github/workflows/docker-ci.yml`, `AGENTS.md`, `knip.json`, `.superset/config.json`; deletes `apps/website`, `apps/lab`, `intentui` | `turborepo`, `writing-for-agents`, `code-review` |

What each change delivers, in one line each:

- **C0** — `@repo/api` exists, `website` imports from it, `bun run check` and `bun run build --filter=website` pass, `/rpc/*`, `/api/healthcheck`, `/api/auth/*` and the activity WebSocket answer the same as before. Website behaviour is unchanged by definition; the proof is the diff touching only import lines and the two files that pass headers.
- **C1** — `bun run dev --filter=web` serves a root shell with tokens, fonts, theme toggle, `components/ui/*` and `components/shared/*` from the lab, router with query client and SSR-query integration, error/not-found/pending components, Paraglide compiling. Home route renders a `PageHeader` only.
- **C2** — nav, mobile nav, ⌘K user search against the real `user.search` endpoint with Recent + Clear history, user menu on a real Better Auth session, system status from the `status` router, toaster, `rpc.$.ts` and `api/auth.$.ts` wired to `@repo/api`.
- **C3** — the filter store with `validateSearch`, filter bar, member chips, objekt card (keyboard contract from port note 5), virtua grid, drawer with the four-branch shape (port note 3), select bar; `/` lists collections through the `collections` router with an infinite query.
- **C4** — `/market` (Price/Date sort) and `/activity` (WebSocket feed) on real data.
- **C5** — `/@nickname` with header, tabs, trades/progress/stats, pins (dnd-kit), lock, checkpoint `?at=` (actions hidden while snapshotting), profile toolbar, `is_profile_bind` vs `profile_address` per port note 6.
- **C6** — lists index and detail, both list addresses with the redirect, create/edit forms (react-hook-form), add-to-list, compare on the URL, `CompareBanner`; the lab's "hide Remove/Set price while comparing" deviation is decided here (default: match website, do not hide).
- **C7** — login, sign-up, reset, verified, Cosmo link/connect, live index and detail with the Stream player and the `?token=` gate, terms and privacy, account dialog. `formatDuration` gets the day/hour fix from the round-35 note.
- **R** — a reviewer with no memory of the implementer's reasoning runs `better-interface` (all six domains) and `web-design-guidelines` against the running app and `code-review` against the change's diff; findings go back to the implementer's terminal, not fixed by the reviewer.
- **C8** — the destructive step. Only after the user has used `web` and says so.

## 3. How the run is orchestrated

Coordinator: this session, following `superset:orchestrate`. Workers: Superset preset
`cbacec3f-9d1a-4413-83a4-6d4f06430c23` (Claude Opus 5), never the default `claude`.

**Workspaces.** C0 and C1 are disjoint and run in parallel; so do C4, C5, C6, C7 once C3
lands. Parallel editors need separate worktrees, so each parallel change gets its own
Superset workspace on a branch `web/<change-id>` cut from the integration branch, and the
worker commits on that branch when its checks pass. The coordinator verifies, then merges
into the integration branch. Sequential changes (C2, C3, C8) run in the main workspace on
the integration branch and do not commit; the user commits.

**Integration branch.** `web/main`, cut from `lab/base-ui-prototype` after the current
uncommitted work (AGENTS.md skill table, `better-*` skills, four lab files) is committed.

**Brief.** Each worker gets the OpenSpec change directory (`proposal.md`, `design.md`,
`tasks.md`) plus a fixed header: change ID, workspace path, allowed paths, the skill list
from the table above with the instruction to invoke each before editing and to name them in
the envelope, the lab file(s) and website file(s) to read first, the verification commands,
and the envelope:

```
SUPERSET_WORKER_DONE
task: C<n>
summary: <one line>
files: <paths>
skills: <skills invoked, in order>
checks: lint=<pass|fail> typecheck=<pass|fail> build=<pass|fail> smoke=<what was opened in the browser>
handoff: <what the next change must know>
```

Verification the coordinator runs itself before marking a change complete:
`bun run lint --filter=<pkg>` (0 errors, 0 warnings for `web` and `api`), `bun run typecheck`,
`bun run build --filter=<pkg>`, `git status --short` shows only the allowed paths, and for UI
changes a browser pass on the routes the change owns at 390 px and 1280 px in both themes.

**Skill enforcement.** Three layers: the worker's `CLAUDE.md → AGENTS.md` skill table loads
automatically in every worktree; the brief names the exact skills and requires the
`skills:` line; the first task in every change's `tasks.md` is "invoke the listed skills and
read the referenced lab and website files". A worker whose envelope omits `skills:` is
asked to redo the review pass, not marked complete.

**OpenSpec.** `/opsx:propose` writes each change before its worker is dispatched, the user
reviews the proposal, `/opsx:apply` is what the worker executes, `/opsx:archive` after the
coordinator's verification. `openspec/config.yaml` gains the `apps/web` rules from § 1.

## 4. Order and parallelism

```
C0 ─┐
    ├─► C2 ─► C3 ─┬─► C4 ─┐
C1 ─┘        │    ├─► C5 ─┼─► C8
             │    └─► C6 ─┤
             └──► C7 ─────┘
```

Each of C2–C7 is followed by its R pass before the next dependent change is dispatched.
Five dispatch rounds in all: {C0, C1}, {C2}, {C3, C7}, {C4, C5, C6}, {C8}.

## 5. Decisions the user owns before dispatch

1. **Worker commits on `web/<id>` branches** for the parallel rounds (needed to merge
   worktrees). Approve once here, or choose fully sequential with no worker commits (slower,
   roughly doubles wall-clock for rounds 1 and 4).
2. **`packages/api` name.** Alternative is folding into `@repo/lib`, rejected because it
   would pull Better Auth, AWS SDK and Redis into `worker` and `indexer`.
3. **Paraglide messages**: copied into `apps/web/messages` and pruned (chosen), or moved
   to a shared `packages/i18n` that both apps compile from. Copy is simpler and the
   website copy dies at C8.
4. **C0 touches `apps/website`.** It is import-only, but it is the first edit to the
   read-only reference. This is the explicit go the plan has been waiting for.
5. **Compare deviation** (C6): match website and keep list edits enabled while comparing,
   or keep the lab's hiding. Default is match website.

## 6. Out of scope

Redesigning behaviour the lab did not change; new features; database schema or migration
changes; touching `apps/worker` or `apps/indexer`; deleting anything before C8; pushing.
