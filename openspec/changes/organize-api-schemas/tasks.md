## 1. Baseline and spike

- [x] 1.1 Spike the spec-only output: in a scratch script, give an `os.route` procedure `.output(documented(z.object({ a: z.string() })))` where `documented` wraps `z.custom` and registers `z.toJSONSchema(schema, { io: "output" })` in `JSON_SCHEMA_OUTPUT_REGISTRY` from `@orpc/zod/zod4`, generate the document, and confirm the 200 response schema names `a` and that a call returning `{ b: 1 }` still succeeds. If the registry leaves `{}`, switch design.md's decision to the route `spec` callback before going on. Delete the script afterwards
- [x] 1.2 Save the current `/api/v1/spec.json` from a dev server (`vite dev --port 3100`) to the scratchpad as `spec-before.json`, plus the bodies of these read endpoints: `/collections?artist=artms`, `/collections/atom02-heejin-348z/metadata`, `/collections/atom02-heejin-348z/serials`, `/collections/atom02-heejin-348z/serials/1/transfers`, `/objekts/owned-by/0x4346c130732a50aecb97bf0c4e7f7588934d8913?artist=artms`, `/transfers/0x4346c130732a50aecb97bf0c4e7f7588934d8913?type=received` and `/activity?type=mint&artist=artms`, each from both `/api/v1` and its legacy `/api` route; every file is non-empty JSON

## 2. Phase 1: move and rename

- [x] 2.1 Create `schemas/common/` and move `query.ts`, `artist.ts` and `checkpoint.ts` into it unchanged; update every importer in `packages/api` and `apps/web`; lint, typecheck and `bun run build --filter=web` pass
- [x] 2.2 Split `objekt.ts` and `owned-by.ts` into `objekts.ts` (owned-by input and result, held result) and `collections.ts` (metadata, serial transfers, collection list, holders, `SerialList`), move `OBJEKT_PREVIEW_SIZE` to `constants.ts`, and fold `current-user.ts` into `user.ts`; no schema changes shape; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 2.3 Move `getCollectionEdition` and its helpers from `schemas/collection-grid.ts` to `packages/lib/src/collection-edition.ts`, exported through `@repo/lib`, and update `features/objekt/objekt-utils.ts` and `features/objekt/drawer/metadata.tsx`; `collection-grid.ts` is gone; lint, typecheck and build pass for `@repo/lib`, `@repo/api` and `web`
- [x] 2.4 Rename exports to the `<procedure>InputSchema` / `<procedure>OutputSchema` convention, with the two `validType` exports becoming `activityTypeSchema` and `transferTypeSchema`, and update every importer; `grep -rn "validType" packages apps/web/src` finds nothing; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 2.5 Cut every inline `.input(...)` schema out of the routers, unchanged, into its namespace file (`list.ts` for the four `list-*` routers; new `pins.ts`, `locked-objekts.ts`, `profile.ts`, `cosmo-link.ts`, `live.ts`); `grep -n "\.input(z\." packages/api/src/routers/*.ts` finds nothing; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 2.6 Verify phase 1: `spec.json` from a dev server is byte-identical to `spec-before.json`, and `bun run check` passes from the root

## 3. Phase 2: merge duplicates

- [x] 3.1 Add `common/address.ts` (`addressSchema`, the same `isAddress` refine) and use it in place of the six inline `z.string().refine(isAddress)` copies in `cosmo-link`, `locked-objekts`, `pins` and `profile`; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 3.2 Add `common/cursor.ts` with `timestampCursorSchema` (activity, transfers) and `receivedAtCursorSchema` (owned-by input and result), replacing the four copies; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 3.3 Add `common/filters.ts` with the six collection filters (artist, member, season, class, on_offline, collection) and spread its shape into the activity and transfers inputs, which keeps their parameter order; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 3.4 Add `common/transfer.ts` with the shared transfer row, which the transfers result uses as is and activity extends with `hash`; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 3.5 Verify the merges: every path, method and parameter in a fresh `spec.json` matches `spec-before.json` (compare `paths` with response objects stripped), and lint, typecheck and build pass for `@repo/api` and `web`

## 4. Phase 2: documented responses

- [x] 4.1 Add `@orpc/zod` (`^1.15.4`, matching the other oRPC packages) to `packages/api`, then `common/documented.ts` following the outcome of 1.1; `bun install` succeeds, and lint and typecheck pass for `@repo/api`
- [x] 4.2 Write `common/objekt.ts` with `ownedObjektSchema` and `indexedObjektSchema`, each with a `satisfies z.ZodType<…>` line against the `@repo/lib` type, and no transforms; typecheck passes for `@repo/api`
- [x] 4.3 Give each of the ten `/api/v1` procedures a real output schema, attached with `.output(documented(...))`; a schema whose body has a type apart from it (the objekt shapes, live sessions, user search) carries a `satisfies` line against that type, and the Cosmo pass-through bodies are documented with `{ open: true }`. `collections.list` keeps its runtime envelope union, with the body documented; lint, typecheck and build pass for `@repo/api` and `web`
- [x] 4.4 Verify the document: in a fresh `spec.json`, every operation's 200 response names its body's fields (owned-by shows `objekts`, `nextCursor`, `total` and the objekt fields), and `/collections` documents 200 and 304; `/api/v1/` renders the operations with their response schemas

## 5. Final verification

- [x] 5.1 Re-fetch every body saved in 1.2 from `/api/v1` and the legacy `/api`: each is identical to its saved copy, apart from rows newer than the baseline at the top of activity and the transfer pages, which are checked by their shape. Recorded as read-only verified
- [x] 5.2 With a browser on the dev server, open `/`, a profile, its trades page and `/activity?type=mint`: each renders its data with no errors in the console or the server log
- [x] 5.3 Run `bun run check`, `bun run build --filter=web` and `bunx oxfmt --check apps/web/src packages/api/src packages/lib/src` from the root; all pass
