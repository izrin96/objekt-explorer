# Tasks

## 1. Routes

- [x] 1.1 Delete the ten route files under `apps/web/src/routes/api/` (`collection.ts`, `objekts/owned-by.$address.ts`, `objekts/held-by.$address.ts`, `transfers.$address.ts`, `objekts/list.$collectionSlug.ts`, `objekts/metadata.$collectionSlug.ts`, `objekts/transfers.$collectionSlug.$serial.ts`, `user.search.ts`, `activity.ts`, `live-sessions.ts`). Verify that `open-app.ts` is still there.
- [x] 1.2 Regenerate `apps/web/src/routeTree.gen.ts` with the router generator, not by hand. Verify that its diff removes only the ten routes.
- [x] 1.3 Reword the cursor comments in `packages/api/src/schemas/transfers.ts` and `packages/api/src/schemas/activity.ts`. Verify that neither names a deleted route.

## 2. Checks

- [x] 2.1 Run `bun run knip`. Delete an export that only a deleted route used and knip now reports; leave anything still imported. Verify that no new finding remains.
- [x] 2.2 Grep each removed path in `apps/`, `packages/` and `openspec/specs/`. Verify that only archived notes and `packages/lib/src/error-scrub.test.ts` still name them.
- [x] 2.3 Verify that lint, typecheck and test pass for `web` and `@repo/api`.
- [ ] 2.4 Browser check on a dev server: each removed path answers 404, its `/api/v1` twin answers 200, and `/api/auth/get-session`, `/api/healthcheck`, `/api/v1/spec.json` and `/api/errors` still work.

## 3. Docs

- [x] 3.1 Grep every `AGENTS.md` for the removed paths and update any it finds, or state that none changed.
