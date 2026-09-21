## 1. Read before editing

- [ ] 1.1 Invoke the `start-core`, `tanstack-start-best-practices`, `better-auth-best-practices`, `supabase-postgres-best-practices` and `turborepo` skills, then read `design.md` of this change, `packages/lib/package.json`, `packages/lib/tsconfig.json`, `packages/lib/oxlint.config.mts`, `apps/website/src/lib/server/api/orpc.ts`, `apps/website/src/lib/server/auth.server.ts`, `apps/website/src/routes/rpc.$.ts` and `apps/website/src/lib/orpc/client.ts`; verify by listing the four couplings from design.md § Context with their file and line numbers in your notes.

## 2. Create `packages/api`

- [ ] 2.1 Add `packages/api/package.json` (`name: @repo/api`, `exports` per design decision 4, scripts `lint`, `lint:fix`, `typecheck`, `format` as in `@repo/lib`, dependencies listed in proposal.md Impact using `catalog:` for `drizzle-orm` and `zod`, `@tanstack/react-start` under `peerDependencies`), `tsconfig.json` extending `@repo/tsconfig/tsconfig.bun.json`, and `oxlint.config.mts` extending `@repo/lint`; run `bun install` and verify `bun pm ls @tanstack/react-start` shows one version.
- [ ] 2.2 Add the `packages/api` workspace to `knip.json` (`entry: ["src/**/*.ts"]`, `project: ["src/**/*.ts"]`) and verify `bun run knip` prints no configuration hints.

## 3. Move the server layer (git mv, no edits)

- [ ] 3.1 `git mv` `apps/website/src/lib/server/api/orpc.ts` → `packages/api/src/orpc.ts`, `server/api/routers/*.ts` → `src/routers/`, every `server/*.server.ts` plus `query-logger.ts`, `currency-rates.ts`, `utils.server.ts` → `src/services/<name>.ts` without the `.server` suffix, `server/activity-websocket.server.ts` → `src/activity.ts`, `universal/*.ts` → `src/schemas/`, `env/server.ts` → `src/env.ts`, `src/i18n/better-auth.ts` → `src/services/auth-locale.ts`; leave `server/middleware.ts` in place; verify with `git status --short` that every moved file shows as `R`.
- [ ] 3.2 Fix relative imports inside the moved files to the new layout (`../orpc`, `../services/…`, `../schemas/…`, `./env`) and add `packages/api/src/constants.ts` with `SITE_NAME` and `MAX_FILE_SIZE`; replace `@/lib/utils` and `@/lib/file` imports with `./constants` / `../constants` and `@/lib/env/server` with the local `env`; verify `bun run typecheck --filter=@repo/api` reports only the Paraglide and Start-context errors that tasks 4 and 5 remove.

## 4. Cut the app couplings

- [ ] 4.1 In `packages/api/src/orpc.ts` declare `ApiErrorKey`, `ApiMessages` (13 keys from proposal.md, `user_failed_get_info` taking `{ provider: string }`), widen the initial context to `{ headers?: Headers; messages: ApiMessages }`, and in `routers/{compare,cosmo-link,profile,user}.ts` replace each `m.api_errors_<key>(…)` with `context.messages.<key>(…)`; verify `grep -rn "paraglide" packages/api` is empty.
- [ ] 4.2 In `packages/api/src/services/auth.ts` remove the `getLocale` callback and the `@/paraglide/runtime` import, import `betterAuthLocale` from `./auth-locale`; verify `bun run typecheck --filter=@repo/api` passes and `bun run lint --filter=@repo/api` reports 0 errors and 0 warnings.
- [ ] 4.3 In `packages/api/src/routers/index.ts` export `router` and the `Inputs`, `Outputs`, `InitialContexts`, `CurrentContexts` types formerly in `apps/website/src/lib/orpc/server.ts`; delete that app file; verify `bun run typecheck --filter=@repo/api` passes.

## 5. Rewire `apps/website`

- [ ] 5.1 Add `@repo/api: workspace:*` to `apps/website/package.json`; add `apps/website/src/lib/api-messages.ts` exporting the `ApiMessages` record built from `m.api_errors_*`; pass `messages` in the context built by `src/routes/rpc.$.ts` and by the `.server` branch of `src/lib/orpc/client.ts`; verify `bun run typecheck --filter=website` no longer errors on context.
- [ ] 5.2 Rewrite every remaining `@/lib/server/…`, `@/lib/universal/…`, `@/lib/env/server`, `../server/…`, `../universal/…` import in `apps/website/src` to the `@repo/api/…` path (services drop the `.server` suffix); make `src/lib/file.ts` and `src/lib/utils.ts` re-export `MAX_FILE_SIZE` and `SITE_NAME` from `@repo/api/constants`; point `server.ts` and `dev-websocket.ts` at `@repo/api/activity`; verify `grep -rn "lib/server/\|lib/universal/\|lib/env/server" apps/website/src apps/website/server.ts apps/website/dev-websocket.ts` returns only `lib/server/middleware`.
- [ ] 5.3 Remove from `apps/website/package.json` any dependency no remaining app file imports (candidates: the three `@aws-sdk/*`, `@better-auth/i18n`, `@t3-oss/env-core`, `slugify`, `nanoid`) after confirming with `grep -rn "<pkg>" apps/website/src apps/website/*.ts`; run `bun install`; verify `bun run knip` lists no unlisted or unused dependency for `apps/website` or `packages/api`.

## 6. Verify

- [ ] 6.1 Run `bun run lint`, `bun run typecheck`, `bun run build --filter=website` from the repo root; verify all pass with 0 lint errors and 0 warnings in `packages/api` and no new warnings in `apps/website`.
- [ ] 6.2 Run `git diff -M --stat lab/base-ui-prototype` and verify every file under `packages/api/src` except `orpc.ts`, `services/auth.ts`, `routers/{compare,cosmo-link,profile,user,index}.ts` shows as a rename at 95 % similarity or higher.
- [ ] 6.3 Start `bun run dev --filter=website` and `bun run --filter=website dev:ws`; in the browser open `/`, `/market`, `/activity` (feed connects), `/list`, one `/@<nickname>` profile, sign in with email + password, refresh, sign out; call `/api/healthcheck`; with a `PARAGLIDE_LOCALE=ko` cookie submit a wrong password on `/login` and verify the error is Korean; record each result in the completion envelope's `checks:` line.
