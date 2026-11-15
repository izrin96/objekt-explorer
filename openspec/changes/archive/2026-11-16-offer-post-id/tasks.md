No task commits, pushes, or runs a migration without the owner's approval for that action. The root `.env` is production. Local runs use `.env.local`, whose `DATABASE_URL` is the local compose Postgres and whose indexer is production read-only. A production read runs read-only (`PGOPTIONS='-c default_transaction_read_only=on'`) and needs the owner's go-ahead. Writes to local test rows need no further approval. No `git stash`.

Each code task ends with `bun run lint` and `bun run typecheck` passing for the package it touched: `--filter=@repo/db`, `--filter=@repo/api` or `--filter=worker`.

Scratch scripts go in `apps/worker/.offer-post-id/` (bun resolves `@repo/*` from the script's path; a dot-directory keeps them out of lint, typecheck and commits). Delete the directory when group 6 is done, and confirm `git status` shows nothing of it. Each one refuses to start unless the hosts of both `DATABASE_URL` and `REDIS_URL` are `localhost` or `127.0.0.1`. Each is deleted when its group is done. Run them from `apps/worker` with `bun run --env-file=../../.env --env-file=../../.env.local <path>`.

## 1. Baseline before any code change

- [x] 1.1 Write `apps/worker/.offer-post-id/offer-views.ts`. It snapshots every local offer's view, for both of its parties:
  - read every `offer.id`;
  - for each party, call `fetchOffers(ids, party)` and `hydrateCards(offerItemCards(rows), party)`, as `offerViews` does (`packages/api/src/services/offer/index.ts:555-565`);
  - map each row through `toOfferView` with one fixed `now`, `new Date("2026-11-16T00:00:00Z")`, and fixed limits `{ muted: false, tradeBlocked: false }`. `actorLimits` is not exported, and the views only have to match across the two runs;
  - write `JSON.stringify` of `{ offerId, viewer, view }[]`, sorted by offer id then viewer, to the path given as its first argument. That path is outside the repo.
- [x] 1.2 Run it on the unchanged code and the unmigrated local database, writing `offer-views-before.json`. Record the local counts read-only:
  - offers with `post_list_id`;
  - of those, offers whose list leads a `trade_post` row;
  - offers whose list leads none.

## 2. Schema and migration

- [x] 2.1 `packages/db/src/schema.ts`, in `offer`:
  - add `postId: integer("post_id").references(() => tradePost.id, { onDelete: "set null" })` after `postListId`;
  - add `index("offer_post_id_idx").on(t.postId).where(sql\`post_id IS NOT NULL\`)` after `offer_post_list_id_idx`;
  - doc comment on `postId`: the lowest `trade_post` row `post_list_id` led when the offer was sent, an address for later features, not history; NULL with it;
  - doc comment on `postListId`: it is the offer's history, which every reader uses (`packages/api/docs/offers.md`).
- [x] 2.2 From `packages/db`, run `bun run db:generate --name offer_post_id`. Confirm that the new `migrations/<timestamp>_offer_post_id/migration.sql` holds only these three statements, and that the snapshot adds only the column, the index and the foreign key:
  - `ALTER TABLE "offer" ADD COLUMN "post_id" integer`;
  - `CREATE INDEX "offer_post_id_idx" … WHERE post_id IS NOT NULL`;
  - `ALTER TABLE "offer" ADD CONSTRAINT … FOREIGN KEY ("post_id") REFERENCES "trade_post"("id") ON DELETE SET NULL`.
- [x] 2.3 Edit that `migration.sql` by hand, keeping the generated statements and their order (design decision 7). Put each block before its own `--> statement-breakpoint`:
  - At the top, the comment and `SELECT set_config('lock_timeout', '3s', true);` exactly as in `20261115125616_drop_linked_list_id`.
  - Next, `LOCK TABLE "trade_post" IN SHARE ROW EXCLUSIVE MODE;`, with a comment: `deleteList` locks `trade_post` rows before `offer` rows, so taking `trade_post` first keeps the migration from waiting on it while holding `offer`.
  - At the end, the backfill of design decision 6, with a comment: same rule as `createOffer`, the lowest row the list leads; offers created by the old build after this migration keep NULL until the first reader's reconcile.

## 3. The writer

- [x] 3.1 `packages/api/src/services/offer/index.ts`, `createOffer`:
  - Before `db.transaction` (line 332), add `const postListId = getRows.some((row) => !keptObjekt(row.item)) ? onPost : null;`. Move the comment at line 428 above it.
  - In the insert, replace line 429 with `postListId,`. Add `postId: postListId === null ? null : sql\`(SELECT min(${tradePost.id}) FROM ${tradePost} WHERE ${tradePost.leadListId} = ${postListId})\`,` with a one-line comment: resolved in the statement, so it costs no round trip and reads the rows as late as possible.
  - Import `tradePost` from `@repo/db/schema`.
- [x] 3.2 Run a grep for `post_id` and `postId` over `packages/api/src`, `apps/worker/src` and `apps/web/src`. The only code hit is the insert. Moderation's `postListId` input is unrelated.
- [x] 3.3 Run `bun run build --filter=web`; it builds.

## 4. The drift script

- [x] 4.1 `apps/worker/src/script/trade-post-drift.ts`: add a fourth entry to `CHECKS`, "an offer whose post is another person's row (offer ids)", with the SQL of design decision 9.
- [x] 4.2 In the same file, add a `NOTES` list printed after `CHECKS` in the same format (count and up to 10 ids). It is not added to `drift`, so it never sets the exit code. It holds the two counts of design decision 9:
  - "an offer on a post now led by another list, its own list still there (offer ids)";
  - "an offer on a list that leads a row, with no post id (offer ids)".
- [x] 4.3 Rewrite the header comment: it now also checks offers' post ids, and the notes are information, with the reason (a merge can hand an offer's row to another list).

## 5. Checks

- [x] 5.1 `bun run check` passes, and `bun run build --filter=web` builds.

## 6. Local proof

- [x] 6.1 Ask the owner to approve applying the migration to the local database. Then run `bun run --filter=@repo/db db:migrate`. The `guard-prod-db` hook allows it only against the local host.
- [x] 6.2 Read the local counts:
  - `post_id` is set on exactly the offers task 1.2 counted as leading a row;
  - `post_id` is NULL on the others;
  - every set `post_id` equals the lowest row its `post_list_id` leads.
- [x] 6.3 Run `offer-views.ts` again on the new code, writing `offer-views-after.json`. Compare it with `offer-views-before.json` using `cmp`: identical. Then delete the script and both files.
- [x] 6.4 Record the Trade state, pairings and `trade_post` rows of `localtest2@local.invalid`, and its three offer rules, so task 6.8 can restore them.
- [x] 6.5 Write `apps/worker/.offer-post-id/paths.ts`. As `localtest1@local.invalid` it sends offers to `localtest2@local.invalid` through `createOffer`, asking only for objekts that localtest2's lists on Trade hold on the indexer, one run per path of design decision 10(b). After each run it reads the new offer's `post_list_id` and `post_id` and asserts the expected value:
  - a named post the asks fit: `post_id` is the lowest row led by `post_list_id`;
  - no post named, every ask through one list: the same;
  - a named post the asks don't fit, `multi_post_asks` on: the list they fit is stored, with its lowest row;
  - asks across posts, `multi_post_asks` on: both NULL;
  - gives only, with `post` named: both NULL;
  - a counter whose asks are only objekts localtest2 offered: both NULL;
  - asks across posts, `multi_post_asks` off (set through `setOfferRules`): refused `other_post`, and no offer row is added.
- [x] 6.6 In the same script, the planner cases of design decision 10(e), as localtest2 through `savePost`, `takeDownPost` and `deleteList`, each with a fresh offer from localtest1. After each, assert the offer's two columns and that no statement errored:
  - **Lead deleted, want list on Trade.** `deleteList` on the have list of a paired post on Trade. `post_list_id` becomes NULL, and `post_id` stays on the same row, now led by the want list.
  - **Lead deleted, want list off Trade.** Both become NULL.
  - **Merge (case b).** A have list posted alone, the offer made on it, the have list taken down, then a live Buy post edited into a Swap post with it. `post_id` becomes NULL, and `post_list_id` keeps the have list.
  - **Takeover (case c).** A paired have and want list on Trade, the offer made on the have list, the post taken down, the want list posted alone as a Swap post, then another live Buy post edited into a Swap post with the have list and `unpair`. `post_id` keeps its row, now led by the old want list. The drift script's first note reads 1.
  - **Deadlock cycle (decision 8b).** Set up a merge as in the case (b) step, with an open offer on the have list. Session one opens a transaction, locks that offer `FOR UPDATE` and does not commit. Run the merge's `savePost` in the background, and confirm through `pg_stat_activity` that it waits. Session one then runs `SELECT 1 FROM lists WHERE id = <any of localtest2's lists> FOR KEY SHARE`. Postgres must abort one side with 40P01 and let the other commit. Afterwards the drift checks read zero, and the offer's columns match whichever side committed.
- [x] 6.7 Run the drift script read-only against the local database. Its four checks read zero, and the notes print the counts the runs above left.
- [x] 6.8 Restore localtest2's Trade state, pairings and offer rules to what task 6.4 recorded, and withdraw any test offer still open. Delete `paths.ts`. Write what each run showed into a new "As built" section of `design.md`.

## 7. Docs

- [x] 7.1 `packages/api/docs/offers.md`, the `offer.post_list_id` paragraph (line 24): add that `post_id` stores the lowest `trade_post` row that list leads, resolved inside the insert, and is NULL with it. Add that `post_list_id` stays the history every reader uses, and `post_id` is an address nothing reads yet. Name the three cases where they part (design decision 3).
- [x] 7.2 `packages/db/AGENTS.md`, Trade posts: add that `offer.post_id` stores a row id, `ON DELETE SET NULL` with a partial index, beside `offer.post_list_id`, which stays. Add that offers created by the old build between the migration and the web deploy keep NULL until the first reader's reconcile.
- [x] 7.3 `apps/worker/AGENTS.md`, Trade post drift: add the offer check and the two notes, and why the notes never fail the script.
- [x] 7.4 `packages/api/AGENTS.md` and the root `AGENTS.md`: no convention, trap or workflow changed, so state that in "As built" and leave them as they are.

## 8. Rollout (the owner)

- [x] 8.1 With a go-ahead, read-only on production, before the migration (design, Migration Plan, step 1):
  - offers whose `post_list_id` names a list not owned by `to_user_id`: must be 0, or stop;
  - offers whose list leads a row (2,003 on 2026-11-16) and offers whose list leads none (68).
- [x] 8.2 The owner commits and pushes; CI passes and moves `:latest`.
- [x] 8.3 The owner runs `docker compose run --build --rm migrate`, then brings up web. The worker is not rebuilt, since it runs none of the changed code. Record the migration's applied time and the time the new web image serves.
- [x] 8.4 With a go-ahead, read-only on production:
  - the backfill counts;
  - the drift script: four checks zero, the two notes printed;
  - the number of offers created between the two times in 8.3.

  Record all of it in `design.md`'s "As built", with the times. The first reader's reconcile uses that window.
