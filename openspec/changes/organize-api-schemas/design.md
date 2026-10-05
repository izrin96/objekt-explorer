## Context

See proposal.md for why. Requirements are in `specs/api-openapi/spec.md`.

- `apps/web` imports `@repo/api/schemas/*` in about 50 places, some from client components, so a schema file that client code imports must stay free of server-only imports (db, redis, auth).
- `packages/api/package.json` exports `./schemas/*` → `./src/schemas/*.ts`. A subpath pattern's `*` matches across `/`, so `@repo/api/schemas/common/artist` resolves without a new entry.
- oRPC validates whatever schema `.output()` is given on every call. The OpenAPI generator reads `.output()`, so a response schema reaches the document only through `.output()` or a route's `spec` callback.
- `@orpc/zod/zod4` exports `JSON_SCHEMA_OUTPUT_REGISTRY`. The converter reads it when it turns an output schema into JSON Schema.
- The root `.env` is production. Verification reads data only through read endpoints that write nothing; user search, live sessions and held-by write caches or rate-limit keys, so they are checked by typecheck.

## Goals / Non-Goals

**Goals:**
- One rule decides where any schema lives, and every `.input()` names an exported schema.
- Response schemas in the document cost nothing at request time.
- Phase 1 is reviewable as a move: no schema changes shape.

**Non-Goals:**
- A barrel `schemas/index.ts`. Per-file imports keep a client bundle from pulling in every feature's schemas.
- Renaming procedures or router keys. Operation ids and `/rpc` paths stay as they are.

## Decisions

### Layout: `common/` plus one file per router namespace

```
schemas/common/   query, artist, checkpoint, address, cursor, filters, transfer
schemas/<ns>.ts   activity, collections, objekts, transfers, list, market, user,
                  profile, compare, pins, locked-objekts, cosmo-link, live
```

`common/` holds building blocks that know no feature. A namespace file holds every input and output of its router's procedures. The four `list-*` router files share `list.ts`, and `current-user.ts` folds into `user.ts`. The profile shapes leave `user.ts` for `profile.ts` first, since `list.ts` imports them and `user.ts` now imports `list.ts`. `config` and `status` take no input of their own and get no file.

Where the current exports go:

| Now | Moves to |
|---|---|
| `query.ts`, `artist.ts`, `checkpoint.ts` | `common/` under the same names |
| `owned-by.ts`, owned and held results in `objekt.ts` | `objekts.ts` |
| metadata, serial transfers, collection list, holders, `SerialList` in `objekt.ts` | `collections.ts` |
| `OBJEKT_PREVIEW_SIZE` | `constants.ts` |
| public user and profile shapes, `ProfilePreview` in `user.ts` | `profile.ts` |
| `LinkedPreview` in `user.ts` | `cosmo-link.ts` |
| `current-user.ts` | `user.ts`, which now imports `list.ts` and `profile.ts` |
| `collection-grid.ts` (`getCollectionEdition`) | `@repo/lib` |

Alternatives considered: one file per procedure, which gives about 60 tiny files whose names repeat the routers'. And grouping by entity (`objekt`, `collection`), which is the mixed rule we have today: owned-by is about an objekt, but its route is a profile's.

### Naming

A procedure's schemas are `<name>InputSchema` and `<name>OutputSchema`, with types `<Name>Input` and `<Name>Output`. `<name>` is the procedure's name, prefixed with its namespace when the bare name says nothing on its own (`activityFeed`, `collectionList`, `marketStats`, `userSearch`, `addressTransfers` for `transfers.byAddress`). A procedure's input minus the path's `address` is `<name>FiltersSchema`, since the legacy routes and the web client share it. A schema-producing function is named `make<Name>Schema`. Input shapes that several namespaces share live in `common/` (`addressTokenIdsInputSchema`, `collectionSlugInputSchema`). Pieces of a body are named after the thing they describe (`activityItemSchema`, `holderRowSchema`). Each enum carries its feature's name: `activityTypeSchema`, `transferTypeSchema`. The activity socket's message schemas keep their names, since they belong to no procedure.

### Spec-only output schemas through the output registry

`common/documented.ts` exports `documented(schema)`. It returns `z.custom<z.output<typeof schema>>()`, which accepts anything at runtime, and registers it in `JSON_SCHEMA_OUTPUT_REGISTRY` with `z.toJSONSchema(schema, { io: "output" })`. The converter merges a registry entry over its own result, and its own result for `z.custom` is `{ not: {} }` (never), which makes the generator drop the response content; the entry therefore sets `not: undefined`. A procedure declares `.output(documented(ownedByOutputSchema))`: the document shows the real shape, the RPC client infers the same type it does today, and a response is never parsed.

Where a body's type exists apart from its schema, the schema carries a `satisfies` line against it: the objekt shapes against `@repo/lib`, and the live sessions and user search bodies against `@repo/cosmo`. The remaining wrappers (feed, owned-by, held-by, transfers, metadata, serials, serial transfers, collection list) are their own source of truth: their services return the types inferred from them, and `documented()` makes each handler return that type, so a missing or mistyped field fails typecheck. Neither check catches extra fields a response carries at runtime; the response comparison in task 5.1 covers that. Output schemas carry no transforms.

Live sessions and user search pass Cosmo's body through unchanged, so `documented(schema, { open: true })` drops `additionalProperties: false` from their document. Their schemas stay closed `z.object`s, since an open one adds an index signature that the `LiveSession` interface cannot satisfy.

`collections.list` keeps its runtime `.output()` union. That union only checks the status and headers envelope; its body becomes `documented(collectionListBodySchema)`.

Alternatives considered: runtime `.output()`, ruled out in the proposal. And a route `spec` callback that writes `responses` by hand per operation. It is the fallback if the registry does not replace the `{}` that `z.custom` produces (task 1.1 checks this first), at the cost of repeating the response wrapper in each route.

### Objekt shapes stay TypeScript in `@repo/lib`

`ownedObjektSchema` and `indexedObjektSchema` are written in `schemas/common/objekt.ts` and checked with `satisfies z.ZodType<OwnedObjekt>` and `z.ZodType<IndexedObjekt>`. A later change can move them into `@repo/lib` and infer the types from them.

### Two phases, each with its own proof

- **Phase 1, move and rename.** Every export lands in its new file under its new name, unchanged in shape. Inline router inputs are cut out unchanged. Proof: `spec.json` is byte-identical before and after, and typecheck passes.
- **Phase 2, merge and document.** Duplicates collapse into the `common/` pieces, and the ten public procedures gain `documented` outputs. Proof: `spec.json` paths, methods and parameters are identical and only response schemas differ, and legacy and v1 responses still match on the read endpoints.

## Risks / Trade-offs

- [A merged schema accepts slightly different input than one of the copies it replaces, e.g. a cursor field that was required in one copy] → phase 2 diffs the parameter schemas in `spec.json`. A difference is resolved by keeping the stricter shape, or by keeping a feature-specific schema with `.extend()`.
- [The transfer row differs between activity (with `hash`) and an address's transfers (without)] → `common/transfer.ts` holds the shared row, and activity extends it with `hash`. Bodies are unchanged, because output schemas never touch responses.
- [A spec-only schema still lies if the compile-time check is skipped] → every `documented` call takes a schema that has a `satisfies` line, and the review checks for it.
- [The registry ignores entries for `z.custom`] → the route `spec` callback fallback above.
- [Renames ripple through about 50 web imports] → each phase lands with typecheck, lint and build passing, so a missed import fails before review.

## Migration Plan

No data, deploy or route changes. Each phase lands as its own commit and rolls back by reverting it. External `/api/v1` clients see only richer response schemas.
