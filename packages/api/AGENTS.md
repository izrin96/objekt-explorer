# @repo/api

oRPC routers (`src/routers/`), Zod inputs (`src/schemas/`), and the services they call (`src/services/`). Pure logic lives in `src/lib/` beside its `*.test.ts`.

## `/rpc` stays compatible with open tabs

A tab loaded before a deploy keeps calling `/rpc` with the input shape it was built with, so every input an older client sends must still validate to the same data. New input fields are optional with a default. Before changing an `.input()`, state what an open tab sends after the deploy and confirm it still validates.

When `/api/v1` needs a different shape (a path parameter wants `{ address }`), change the shared procedure instead of adding a v1-only twin: give it a `z.preprocess` input that maps the old shape onto the new one (`addressOrBareInputSchema` in `schemas/common/address.ts`, `profileListsInputSchema` in `schemas/list.ts`), move the web callers to the new shape, and mount it in `openApiRouter` (`routers/index.ts`). Map a legacy key only when the new key is absent, so it cannot become a query-string override on `/api/v1`. In `openApiRouter`, mount a router whole when every procedure in it is a public read; pick procedures by name only when it also holds writes.

## Errors

A refusal the web app can show goes through `refuse(status, reason, message, data?)` (`src/lib/refuse.ts`): `reason` is a domain-prefixed code (`list_have_links_want`) from a `*_REFUSALS` tuple in `src/schemas/`, and `message` is an English sentence that the web app never renders; it serves tabs opened before a deploy and `/api/v1` callers. Chat, offer and moderation keep their own helpers with bare codes. A procedure that must keep an error code for old tabs to branch on declares it with `.errors()` and a `data: z.object({ reason })` schema. The web app translates the code through `refusalText` or the domain's own formatter, never `error.message`; a new code needs an `api_errors_*` string in `en`, `ko` and `ja`.

## Objekt shapes

`mapOwnedObjekt` and `overrideCollection` live in `@repo/lib/server/objekt`. Run any `ValidObjekt` through `overrideCollection`: it applies the colour and band-image overrides by slug. An `OwnedObjekt` at runtime:

- `id` is the objekt's token id; `mapOwnedObjekt` overwrites the collection's UUID with it.
- `collectionId` is the collection's `collection_id` string (`"201z"`-style), never the UUID.
- `receivedAt` and `mintedAt` are `Date`s on the server and ISO strings once serialised.
- `isPin` and `isLocked` are `undefined` when they do not apply.
