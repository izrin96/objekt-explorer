## 1. Schema and migration

- [x] 1.1 In `packages/db/src/schema.ts`, add `lists.updatedAt` (timestamptz, not null, default now) and the `hidden_trade_partner` table from design D5. `bun run typecheck --filter=@repo/db` passes
- [x] 1.2 Run `bun run --filter=@repo/db db:generate`, then add the `updated_at` backfill (greatest of the list's `created_at` and its newest entry's `created_at`) to the generated SQL. Confirm by reading that it only adds the table, the column and the one `UPDATE`. Apply it to the local Docker database with `bun run --filter=@repo/db db:migrate`. A query shows no list whose `updated_at` is earlier than its `created_at` or its newest entry. Never apply it to production without the user's approval

## 2. Keep `lists.updated_at` current

- [x] 2.1 Add `touchList(tx, listIds)` in `services/list.ts`: it sets `updated_at` and increments `trade:foryou:v:<ownerId>` in Valkey. Call it at every list update and every entry insert or delete in `services/list.ts`, `routers/list-crud.ts`, `routers/list-entries.ts`, and in the outbox drain's `cleanupAddress` in `apps/worker/src/job/drain.ts`. A grep for `update(lists)`, `insert(listEntries)` and `delete(listEntries)` shows each site covered. Adding an entry locally moves that list's `updated_at`. Lint, typecheck and build pass for `@repo/api` and `worker`

## 3. Ranking module

- [x] 3.1 Add `packages/api/src/lib/trade-rank.ts`, a pure module with no database imports, containing:
  - `toPartnerIdentity` (design D4);
  - the stage 2 recount from ownership verdicts, with Not shown counts by reason;
  - the four filters;
  - ordering (mutual, then sum, then latest `updated_at`, with partners idle for 30 days or more last) and the cut to 50.

  Add `trade-rank.test.ts` covering the spec scenarios: mutual beats one-sided, ranked on what is still owned, idle high scorer, default Mutual only, bound nickname, hidden nickname, no bound address, two bound addresses. `bun test` passes; lint and typecheck pass for `@repo/api`

## 4. Matching service and API

- [x] 4.1 Add `services/trade-matches.ts` with the stage 1 query from design D1: one `GROUP BY` partner over all of the user's have and want lists (or the filtered one), excluding the user and hidden partners, ordered by the filter's key and limited to 200. On the local copy, a known heavy account (the user with the most want entries) completes in under 1.5 s; record the timing. Lint and typecheck pass for `@repo/api`
- [x] 4.2 Add the ownership pass from design D2: one `user_address` lookup and one indexer query over the candidates' matched collections and objekt ids. Feed the verdicts into `trade-rank.ts`. Against the read-only production indexer, a partner with a known sold entry shows it under Not shown and not in the counts. Lint and typecheck pass for `@repo/api`
- [x] 4.3 Wrap the result in `getCache` with the versioned key from design D3. A second load is served from cache, and adding an entry to the user's own list changes the next result. Lint and typecheck pass for `@repo/api`
- [x] 4.4 Add `routers/trade.ts` with these authed procedures, registered in `routers/index.ts` but not in `openApiRouter`:
  - `forYou({ filter, list? })`, which ignores a `list` the caller doesn't own;
  - `listMatchCount({ slug })`;
  - `hidePartner` and `unhidePartner({ userId })`;
  - `hiddenPartners()`.

  Zod schemas go in `schemas/trade.ts`, using `import * as z`. `list.findTradePartners` is unchanged. Lint and typecheck pass for `@repo/api`, and build passes for `web`

## 5. Web

- [x] 5.1 Add the en, ja and ko messages: Trade matches, the four filters, All lists, the mutual score, Not shown and its reasons, idle, Hide, Unhide, the hidden-partners list, and the empty and error states. `paraglide:compile` runs clean; lint and typecheck pass for `web`
- [x] 5.2 Move the partner row and objekt thumbnails from `features/list/trade-matches/content.tsx` to `features/trade/`. Add `routes/(container)/trade/index.tsx` (redirect) and `trade/for-you.tsx` with `validateSearch`, the `beforeLoad` sign-in guard and the prefetching loader from design D6. `routeTree.gen.ts` regenerates; lint, typecheck and build pass for `web`
- [x] 5.3 Build the For you view from the §02 mockup:
  - the filter segment and the list select, both URL-bound;
  - rows with identity, the mutual score, both directions with my-list labels, the idle marker and Hide;
  - the Not shown line, which opens the hidden-partners list with Unhide;
  - empty and error states.

  Lint, typecheck and build pass for `web`
- [x] 5.4 Replace the list header's Trade matches dialog with a `Link` to `/trade/for-you?list=<slug>` showing `listMatchCount`, for the owner of a have or want list only. Delete `features/list/trade-matches/index.tsx` and its use in `list-header.tsx`. Add Trade matches to `components/layout/user-menu.tsx`. Lint, typecheck and build pass for `web`

## 6. Verification

- [x] 6.1 Run `bun run check` and `bun run build --filter=web` from the root; both pass
- [x] 6.2 With `bun run dev --filter=web`, the local app database and the read-only production indexer, signed in as the smoke-test account:
  - `/trade` lands on `/trade/for-you` with Mutual only selected;
  - switching filters and the list select updates the URL and the rows;
  - a known sold or non-transferable entry shows under Not shown;
  - hide and unhide work against the local database, and the list header's count matches the For you row count for that list;
  - signed out, `/trade/for-you?list=x` redirects to login with the full URL;
  - at 390 px there is no horizontal scroll.
