## 1. Web image

- [x] 1.1 Create `apps/web/Dockerfile` from `apps/website/Dockerfile` with `prune web`, `--filter web build:prod`, `apps/web/server.ts` and `apps/web/dist`; verify `docker build -f apps/web/Dockerfile` with dummy secret files completes.
- [x] 1.2 Set `SERVER_PORT` default to 3000 in `apps/web/server.ts`; verify `bun run lint --filter=web` 0/0, `bun run typecheck --filter=web`, `bun run build --filter=web` pass.
- [x] 1.3 Add `apps/web/turbo.json` (build, build:prod outputs; lint inputs) matching the website's; verify `bun run build --filter=web` still passes and `bunx turbo run build:prod --filter=web --dry=json` lists `dist/**` outputs.

## 2. Deploy pipeline

- [x] 2.1 In `docker-compose.yml` rename service `website` to `web` and point its dockerfile at `apps/web/Dockerfile`; verify `docker compose config --quiet` passes and the rendered service keeps ports, environment, secrets and healthcheck.
- [x] 2.2 In `.github/workflows/docker-ci.yml` point the `web` matrix entry at `apps/web/Dockerfile`, change the `web` filter to `apps/web/**`, add a `website` filter used only by `validate`; verify the YAML parses (`python3 -c "import yaml"` load) and the matrix, filters and job conditions read as intended.

## 3. Proof

- [x] 3.1 Run the built image locally with the root `.env` on a spare port; verify `/api/healthcheck` returns `OK`, `/` returns HTML with status 200, and the container stops cleanly on SIGTERM. No writes are made.

## 4. Documentation

- [x] 4.1 Update `AGENTS.md`: monorepo table (web main, website legacy until removal), command examples, Paraglide note, Docker and Superset lines; verify `bunx oxfmt --check AGENTS.md` and that the root `bun run lint` and `bun run typecheck` still pass.
