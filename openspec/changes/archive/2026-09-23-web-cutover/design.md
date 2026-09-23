## Context

The website ships as a single image: `turbo prune website --docker`, a Bun install from the
pruned lockfile, `vite build` with the `VITE_*` values mounted as BuildKit secrets, and
`server.ts` compiled with `bun build --compile` into a Debian slim runtime. Compose exposes it
on 3000 with `/api/healthcheck` as the probe; CI builds the image per changed app and pushes
`ghcr.io/<repo>-web`. `apps/web` already has the same `server.ts` (only the default port
differs), the same `build:prod` script, the same `/api/healthcheck` route and the same four
build-time `VITE_*` variables. It lacks a Dockerfile and a `turbo.json`.

`apps/website` stays in the repo, so CI's `validate` job must still run when only it changes,
and nothing may break its local `build`.

## Goals / Non-Goals

**Goals:** one image build path for `web` identical in shape to the website's; the deploy
pipeline switched with the smallest diff; a local proof that the image builds and answers.

**Non-Goals:** removing the website, a knip gate, a second image or a parallel compose
service for A/B (both would fight over port 3000 and the image name).

## Decisions

- **Copy the website Dockerfile rather than parameterise it.** A shared Dockerfile with an
  `APP` build-arg would save 40 lines but couple the two apps' build steps during the very
  window where the website is meant to be frozen. The copy is deleted with the website later.
- **Default `PORT` to 3000 in `apps/web/server.ts`.** Alternative: keep 3200 and set `PORT`
  in compose. The image should run correctly with no environment, as the website's does, and
  the dev server's port lives in `vite.config.ts`, so nothing in development moves.
- **Rename the compose service to `web` instead of adding a second one.** Compose service
  names are internal; nothing references `website` by hostname (checked: no `http://website`
  in the repo). One service keeps port 3000 unambiguous.
- **Keep the CI image name `<repo>-web`.** The name was already `web` while it built the
  website, so the running deployment needs no reconfiguration. Only the Dockerfile path and
  the change filter move.
- **Add a `website` path filter to CI feeding only `validate`.** Without it a website-only
  commit would skip lint and typecheck. With `apps/website/**` left in the `web` filter every
  website edit would rebuild the web image for nothing.
- **`apps/web/turbo.json` copied from the website's.** Turbo resolves `build:prod` outputs
  from the package config; without it the production build is uncached and `.tanstack/**`
  is not tracked.

## Risks / Trade-offs

- [The image builds in CI but not locally, or vice versa] → task 3 builds the image on this
  machine with dummy `VITE_*` secret files and runs it against the root `.env` (read-only
  browsing), probing `/api/healthcheck`, `/` and `/ws` before the change is marked done.
- [`turbo prune web` drops a workspace the build needs] → the pruned lockfile install runs
  `--frozen-lockfile`; a missing workspace fails there, not at runtime.
- [The first `main` push deploys the redesign before the user intends] → this is the point
  of the change, and the user controls when `web/main` merges into `main`. Rollback is a
  revert of this change; the website image path still exists on that commit.
- [`VITE_SITE_URL` in the root `.env` is `http://localhost:3200`] → the local container run
  will refuse cross-origin WebSocket upgrades from other origins, which is expected; the probe
  uses no Origin header.

- [Probing the image with `docker run --env-file .env` fails on the main database] → that
  parser keeps the quotes and the inline `# comment` on the `DATABASE_URL` line verbatim, so the
  host resolves to a word from the comment. Compose parses `.env` correctly; for a manual probe
  source the file in the shell and forward keys with `-e KEY`. Verified 2026-09-23: with the env
  forwarded, `/`, `/market`, `/activity`, `/@nickname`, progress, trades, `/login` answer 200,
  `/list` 307, unknown paths 404, `/ws` upgrades, SIGTERM exits 0.

## Migration Plan

1. Merge `web/main` into `main` when ready. CI builds `<repo>-web:latest` from `apps/web`.
2. The deployment target pulls `:latest` as it does today. Watch `/api/healthcheck` and the
   activity WebSocket after the first start.
3. Rollback: revert the merge commit of this change on `main`; CI rebuilds the website image
   under the same tag.
