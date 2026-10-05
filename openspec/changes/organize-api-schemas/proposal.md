## Why

`packages/api/src/schemas` grew one endpoint at a time, so its files follow three different rules: some are named after a feature (`activity`, `market`), some after one endpoint (`owned-by`, `checkpoint`), and some after a value type (`artist`). `objekt.ts` holds five features' worth of schemas. Cursors, transfer rows, the six collection filters, the transfer-type enums and the address check are each defined two to six times. About forty procedure inputs are written inline in routers. Now that `/api/v1` publishes these schemas as an OpenAPI document, the layout is a public contract's source. Its responses also appear as `{}` there, because outputs are typed with `z.custom`.

## What Changes

- Shared building blocks move to `schemas/common/`: `queryArray`, the artist schemas, the checkpoint, the cursors, the collection filters, the transfer row and an address schema.
- Each router namespace gets one schema file holding its inputs and outputs: `activity`, `collections`, `objekts`, `transfers`, `list`, `market`, `user`, `profile`, `compare`, `pins`, `locked-objekts`, `cosmo-link`, `live`.
- Names follow `<name>InputSchema` / `<name>OutputSchema`, with inferred `<Name>Input` / `<Name>Output` types.
- Router inputs written inline move into the feature files; routers only reference them.
- Duplicates merge into one definition each. The two `validType` exports become `activityTypeSchema` and `transferTypeSchema`.
- Code that is not a schema leaves `schemas/`: `getCollectionEdition`, which the browser also runs, moves to `@repo/lib`, and plain types sit beside the schemas they describe.
- The ten `/api/v1` procedures gain real output schemas. They are used for the OpenAPI document only and never validate a response at runtime.
- The work lands in two steps: first a pure move and rename with no behaviour change, then the merges and the output schemas.

## Capabilities

### New Capabilities

- `api-openapi`: the `/api/v1` OpenAPI document. Every operation documents its inputs and its success response body, and reorganizing schemas leaves request and response contracts unchanged.

### Modified Capabilities

None. No page behaviour changes.

## Routes

- `/api/v1/*` and its document at `/api/v1/spec.json` and `/api/v1/`: request contracts unchanged; response bodies newly documented.
- `/rpc/*`: procedure inputs and outputs unchanged.
- The legacy `/api/*` routes: responses unchanged.
- No page route changes.

## Non-goals

- Turning `OwnedObjekt`, `IndexedObjekt` and `ValidObjekt` in `@repo/lib` into Zod schemas. Output schemas are written in `packages/api` against those types; a later change can move them.
- Validating responses at runtime with `.output()`. Large responses, such as 8,000-row owned-by pages and the 1,844-collection list, would pay for it on every call.
- Changing any `/api/v1` path, parameter or response body, or any legacy `/api` response.
- Removing the legacy `/api` routes.
- Output schemas for procedures outside `/api/v1`.

## Impact

- `packages/api`: every file under `schemas/` moves or is renamed, and every router changes its imports. `@orpc/zod` becomes a dependency, for its JSON Schema output registry.
- `apps/web`: about 50 imports from `@repo/api/schemas/*` are updated; no runtime change.
- `packages/lib`: gains `getCollectionEdition`. `apps/worker` and `apps/indexer` import nothing from `schemas/` and are untouched.
- `/api/v1/spec.json` gains response schemas; its paths and parameters stay identical.
