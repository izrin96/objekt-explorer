## Why

`apps/web` has been used against production for two days and every reported gap is closed,
but nothing can deploy it: the only Dockerfile, compose service and CI image still build
`apps/website`. This change makes `web` the app the deploy pipeline ships, so the redesign
reaches users the next time `main` is pushed.

## What Changes

- New `apps/web/Dockerfile`, a copy of the website's: `turbo prune web`, `bun install`,
  `build:prod` with the four `VITE_*` build secrets, `server.ts` compiled to a standalone
  binary, `debian:bookworm-slim` runtime with `curl` for the healthcheck, port 3000.
- `apps/web/server.ts` defaults `PORT` to 3000 like the website's, so the image and the
  compose service agree without an environment override. The Vite dev server keeps 3200.
- New `apps/web/turbo.json` declaring `build` / `build:prod` outputs and the lint inputs,
  matching the website's, so Turbo caches the production build.
- **BREAKING (deploy):** `docker-compose.yml` service `website` becomes `web` and builds
  `apps/web/Dockerfile`; same ports, environment, secrets and healthcheck.
- **BREAKING (deploy):** `.github/workflows/docker-ci.yml` builds the `web` image from
  `apps/web/Dockerfile` and its change filter watches `apps/web/**`. The image name
  `<repo>-web` is unchanged, so whatever pulls `:latest` today receives the redesign on the
  next push to `main`. A new `website` filter keeps lint and typecheck running when only
  `apps/website` changes.
- `AGENTS.md`: `apps/web` becomes the main frontend row, `apps/website` is marked as the
  legacy reference kept until the follow-up removal; command examples, the Paraglide note and
  the Docker and Superset lines name `web`.

## Non-goals

- Deleting `apps/website`, `apps/lab` or `intentui/`, and turning `knip` into a gate. The
  user wants the website source kept as a fallback for now; those land in a later change.
- Pruning `messages/*.json` further, rewriting the migration plan, or touching
  `.superset/setup.sh`.
- Any change to the worker or indexer images, to Postgres, pgbouncer or Valkey services.
- A staging environment or blue-green switch. Rollback is `git revert` of this change, which
  points the pipeline back at the website image.

## Surfaces covered

No website route changes. Deploy surfaces only: `apps/web/Dockerfile`, `apps/web/server.ts`,
`apps/web/turbo.json`, `docker-compose.yml`, `.github/workflows/docker-ci.yml`, `AGENTS.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is deployment tooling; no user-observable behaviour of `web` changes
(`skip_specs: true`).

## Impact

- New files: `apps/web/Dockerfile`, `apps/web/turbo.json`.
- Edited: `apps/web/server.ts` (one constant), `docker-compose.yml`, `.github/workflows/docker-ci.yml`, `AGENTS.md`.
- The production deployment target starts serving `apps/web` on the first `main` push after
  merge. `apps/website` still lints, type-checks and builds locally but no longer produces an
  image.
