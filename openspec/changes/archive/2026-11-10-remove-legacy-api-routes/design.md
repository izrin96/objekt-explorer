# Design

## Context

Every removed route calls the service behind an oRPC procedure that `openApiRouter` (`packages/api/src/routers/index.ts`) already mounts at `/api/v1`. The routes are plain `createFileRoute` GET handlers; deleting the files and regenerating `routeTree.gen.ts` removes them.

## Decisions

1. **Remove outright, no redirects.** The user chose removal without an access-log check. A removed path answers the framework's 404.
2. **Keep `open-app.ts`.** It redirects to `cosmo://` and has no oRPC twin.
3. **The route tree is generated, never edited.** Regenerate it with the TanStack router generator and check the diff removes only these ten routes.
4. **Spec text.** "Stable contracts" keeps its scenarios: the scenario "Legacy and v1 responses still match" keeps its name (a MODIFIED block must) and now says a removed path answers 404 while its `/api/v1` twin answers as before. The held-by and transfers requirements name only `/rpc` and `/api/v1`.
5. **Schema comments.** The cursor comments in `schemas/transfers.ts` and `schemas/activity.ts` described the legacy routes; they are reworded to describe the schema, or dropped if they only narrated the routes.

## Risks

- Outside clients of the legacy paths break. Accepted by the user.
- The anonymous indexer-heavy reads remain open on `/api/v1` and `/rpc`; see Non-goals in the proposal.
