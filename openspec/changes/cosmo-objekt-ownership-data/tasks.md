# Tasks

## How every task is checked

- **Package checks.** A task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for each package it touches (`--filter=@repo/cosmo`, `@repo/lib`, `@repo/db`, `@repo/api`, `worker` or `web`). `@repo/cosmo` and `@repo/lib` have no build script, so a task touching them also builds the package that imports the change (`worker` or `web`).
- **Tests.** They cover pure modules only, run with `bun test` beside the code, and never touch the database, Redis or Cosmo. Fixtures use made-up token ids, addresses and serials.
- **Production.** It is only read. `.env.local` points the indexer at production with `default_transaction_read_only=on`, so every local indexer write fails there. A write path is verified up to that failure (the statement it would send, logged at `debug`) and recorded as "read-only verified".
- **Local rows.** Seeding a `cosmo_objekt` or `cosmo_transferable` row on the local app database needs the owner's approval first, once per task that asks for it. Seed only made-up rows or token ids read from production; never seed a `cosmo_session` with a real cookie.
- **Owner steps.** Tasks marked **(owner)** apply a migration, change the VPS, set `COSMO_OBJEKT_WRITES`, or write to production. Only the owner runs them.
- **Wording.** "Decision N" means this change's design.md, Decisions, section N. Load `vercel-react-best-practices` before any `.tsx` edit in `apps/web`. Names follow Decision 12: Cosmo's terms, never the words of Objekt Tracker's own lock feature.

## 1. Cosmo client: parsing `objekts[]` (pure)

- [x] 1.1 In `packages/cosmo/src/session-parse.ts` (Decision 2):
  - Add `summaryObjektSchema` with exactly the fields of Decision 2's table and their rules. `tokenId` becomes a decimal string; `owner` is lowercased; `nonTransferableReason` is the reason when it matches `^[a-z0-9-]{1,64}$`, `"other"` when it does not, `null` when absent; `usedForGrid` defaults to `false`. Export `SummaryObjekt`.
  - `objektSummariesSchema` keeps its output and adds `objekts: SummaryObjekt[]` (every collection's entries, flat), `skippedObjekts` and `partial`: the count of items whose `count` differs from their `objekts.length`. Each entry parses alone with `safeParse`, so a bad entry adds to `skippedObjekts` and never to `skipped` (which stays per collection). An item with no `objekts` array gives none.

  `session-parse.test.ts` adds:
  - a page with two collections and three objekts, one of them not transferable for `challenge-reward` with `usedForGrid: true`;
  - an entry missing `tokenId` (`skippedObjekts: 1`, its collection still parsed);
  - a `nonTransferableReason` of `"Bad Reason!"` (`"other"`);
  - an upper-case owner (lowercased);
  - an item with `count: 3` and two objekts (`partial: 1`);
  - `acquiredAt`, `lenticularPairTokenId` and `artist` absent from the parsed output.

  `bun test packages/cosmo` passes. Lint and typecheck pass for `@repo/cosmo`; build passes for `worker`.

## 2. App schema

- [x] 2.1 In `packages/db/src/schema.ts`, add `cosmoObjekt` (`cosmo_objekt`) and `cosmoTransferable` (`cosmo_transferable`) with the columns, CHECKs and indexes of Decision 3:
  - `transferable_outcome` CHECK in `('matched','moved','chain_newer','spin','missing','report_untransferable','report_transferable','written_untransferable','written_transferable','raced')`;
  - `cosmo_transferable`'s CHECK that `superseded_at` and `superseded_block` are both null or both set;
  - the three partial indexes on `cosmo_objekt`: `(slug) WHERE serial_eligible`, `(slug) WHERE serial_due`, `(observed_at) WHERE transferable_due`;
  - no column naming a user, session or address, and no foreign key on either table, so no account or session deletion cascades to them (Decision 7).

  Export `type CosmoObjekt` and `type CosmoTransferable`. Run `bun run --filter=@repo/db db:generate` and read the SQL: two `CREATE TABLE`, their CHECKs and three partial `CREATE INDEX`, nothing else. Do not run `db:migrate`. Lint, typecheck and build pass for `@repo/db` and `@repo/api`.
- [ ] 2.2 **(owner)** Apply the migration locally (`db:migrate`, `.env.local` on the compose Postgres), and on production with `docker compose run --build --rm migrate` before the deploy that reads the tables (task 9.2).

## 3. Worker: recording

- [x] 3.0 Create `packages/lib/src/cosmo-objekt-writes.ts` (pure, browser-safe) with `objektWriteModes(raw)`, exported as `@repo/lib/cosmo-objekt-writes` (Decision 10): a comma list, trimmed and lowercased, returning `{ anchors, untransferable, transferable, unknown: string[] }`; `undefined` and `""` give all false. `cosmo-objekt-writes.test.ts` covers unset, `"anchors"`, `" Anchors , untransferable "`, `"anchors,untransferable,transferable"` and `"anchors,bogus"` (`unknown: ["bogus"]`). `bun test packages/lib` passes. Lint and typecheck pass for `@repo/lib`; build passes for `worker` and `web`.
- [x] 3.1 Create `apps/worker/src/lib/cosmo-objekts.ts` (pure) and `cosmo-objekts.test.ts`:
  - `serialEligible(read, indexerObjekt)` returns true, false or null under Decision 5's trust rules: null when the token is not in the indexer; true when the indexer's slug equals the read's, the collection is offline or in `preAssignedCollections`, and `minted_at` is at or after `V1_CUTOFF_MS`; false otherwise.
  - `observationsOf(objekts, sessionAddress, indexerObjekts, chainHeight, observedAt)` returns `{ rows, skipped: { notMinted, otherOwner, holderMismatch, duplicate } }` (Decision 4). `indexerObjekts` is a `Map` of token id to `{ owner, mintedAt, slug, onOffline }` with the owner lowercased; a token missing from it is kept. Each row has `tokenId`, `slug` (`slugifyObjekt(collectionId)`), `objektNo`, `transferable`, `nonTransferableReason`, `usedForGrid`, `serialEligible`, `chainHeight` and `observedAt`. The address comparison is lowercase on both sides, and of two entries with one token the later wins.
  - Import `objektWriteModes` from `@repo/lib` (task 3.0) wherever the worker reads the switch.

  Tests cover each skip reason (a token the indexer holds under another owner, and one the indexer lacks, which is kept with `serialEligible: null`), each `serialEligible` rule (another slug, an online collection, a pre-assigned online one, a pre-cutoff mint, an eligible one), the duplicate rule, a mixed-case session address and the slug mapping of a real-shaped `collectionId`.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.
- [ ] 3.2 Record from the sync, in `apps/worker/src/job/collection-media.ts`:
  - In `syncPhase`, before the first session, read the final height (`select max(height)::int as height from squid_processor.status`, through `indexer.execute`) into `run.chainHeight`. A failure or null leaves it null and counts `no_height`.
  - In `recordPage`, after the collection merge, when `run.chainHeight` is set: one indexer read of the page's token ids (Decision 4, The holder check: `id`, `owner`, `minted_at`, the collection's `slug` and `on_offline`), then `observationsOf(page.objekts, session.cosmoAddress, indexerObjekts, run.chainHeight, now)`, then one upsert into `cosmo_objekt` from `unnest` arrays with the `ON CONFLICT (token_id) DO UPDATE` of Decision 4. `serial_due` becomes true only where `objekt_no` or `slug` changed and `serial_eligible` is not false; `serial_eligible` is written on insert, where `objekt_no` or `slug` changed, or where it is null; `transferable_due` is always true. Pass `session` into `recordPage`. The indexer read and the upsert sit in their own try/catch after the media merge: a failure adds the page's objekts to `run.objektsFailed` and never reaches the session's catch, so the media is recorded, the cursor moves and the session is not parked. One `warn` per run carries the count (Decision 4, Failure isolation).
  - Add `objektsRecorded` to `Run`, and `objekts recorded N` to the run's `info` summary (which now also logs when only objekts were recorded). Add the skip counts, `no_height`, `skippedObjekts` and `partial` to the heartbeat.
  - In `docker-compose.yml`, add `COSMO_OBJEKT_WRITES` to the `worker` and `web` environments, from the root `.env` (Decision 8). In `.env.example`, add `COSMO_OBJEKT_WRITES=` with a comment listing `anchors` (confirmed serials as anchors), `untransferable` and `transferable`, and saying empty records only.

  Checks:
  - `import-boundary.test.ts` passes.
  - `docker compose config` exits 0.
  - Read the diff: no new Cosmo call, the request budget is untouched, no session id, user id, nickname or address is written to `cosmo_objekt` or logged beside a token id, the upsert never touches `cosmo_transferable`, and nothing deletes `cosmo_objekt` rows (Decision 7).
  - Lint, typecheck and build pass for `worker`.

## 4. Worker: transferable corrections

- [x] 4.1 Create `apps/worker/src/lib/cosmo-transferable.ts` (pure) and its test:
  - `judgeTransferable(objekt, read, mode)`, where `objekt` is `{ transferable, owner, receivedAt, slug, newerChange } | null`, `read` is a `cosmo_objekt` row, and `mode` is `{ untransferable, transferable }`. It returns one outcome of Decision 6's table, checked in that table's order: `missing`, `moved`, `chain_newer`, `spin`, `matched`, then `report_*` or `write_untransferable` / `write_transferable` (a plan, turned into `written_*` or `raced` by the caller).
  - `confirmationOf(outcome, read, objekt)` returns the `cosmo_transferable` row to store for `matched` and `written_*` (the read's value, `observed_at`, `chain_height`, the judged `received_at`) and `null` for every other outcome (Decision 6, the record's invariant).
  - `outcomeCounts(outcomes)` for the summary.

  Tests cover every outcome; a read of `received_at` equal to `observed_at` (not moved); a spin owner in any letter case; `untransferable` on and `transferable` off with both directions present; that a read that agrees but moved is `moved`, not `matched`; and that `confirmationOf` gives a row only for `matched` and `written_*`.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.
- [ ] 4.2 Add `applyCosmoTransferable(mode)` to the apply phase of `job/collection-media.ts`, after the collection apply (Decision 6):
  - Read up to 5,000 rows `WHERE transferable_due ORDER BY observed_at` from `db`.
  - Per chunk of 500, read the indexer in one statement: `objekt.id, transferable, owner, received_at`, the collection's `slug`, and `newerChange` (an `EXISTS` on `transferability_update` with `block_number > height OR applied_at IS NULL`, with the height passed per token through `unnest`).
  - Judge each row. For each direction with planned writes, run the guarded `UPDATE … RETURNING` of Decision 6 inside an indexer transaction with `SET LOCAL lock_timeout = '5s'`. Returned ids are `written_*`; the rest of the plan are `raced`.
  - In one app transaction: store every outcome (`UPDATE cosmo_objekt … FROM unnest`), setting `transferable_due = false` except on `raced`; and upsert `confirmationOf`'s rows into `cosmo_transferable`, clearing `superseded_*`, only where the stored `observed_at` is older. A lock timeout (55P03) leaves that chunk's rows due and counts it.
  - Log as Decision 11 says. `mode` comes from `objektWriteModes(process.env.COSMO_OBJEKT_WRITES)`, read once per process. Unknown words give one `warn` per process.
  - Wrap the step in its own try/catch in `runSyncOnce`: any error but a lock timeout logs one `warn` with `errorCode(error)` and leaves the rows due, and `deleteLongDead` and `sendExpiryNotices` still run.
  - Confirm no reader caches `objekt.transferable`: `grep -rn transferable packages/api/src/services` and check each hit against Redis keys (`getStaleCache`, `redis.set`). If one does, delete or bump its key after a run that wrote, as the collection apply bumps `collection:modified-at`, and record it in design.md, Decision 6.

  Read-only verified, with the owner's approval for seeded local rows: seed three `cosmo_objekt` rows for real production token ids whose `transferable` disagrees with production (find them read-only with the plan script, task 6.1, or invert a real value in the seed), with `chain_height` from production's `squid_processor.status`. Call `applyCosmoTransferable({ untransferable: true, transferable: true })` once from `bun -e` in `apps/worker` with `.env.local`. The plan logs (`debug`) the writes it would send, and the `UPDATE` fails at the read-only indexer, so no `cosmo_transferable` row is stored. Then with both off: the rows get `report_*` outcomes, nothing reaches the indexer, and `cosmo_transferable` stays empty. Then seed one row whose value matches production: it is `matched` and its `cosmo_transferable` row is stored locally.

  `import-boundary.test.ts` passes. Lint, typecheck and build pass for `worker`.
- [ ] 4.3 `fix-transferability` never reverts a Cosmo-confirmed value (Decision 6, Against `fix-transferability`):
  - In `apps/worker/src/lib/transferability-check.ts`, add the pure `cosmoHold(mismatch, record, newestBlock)` returning `apply`, `held` or `superseded`, with tests: no record; a record agreeing with the chain value; a record disagreeing with no newer update (`held`); a newer update above the record's `chain_height` (`superseded`); an update at exactly that height (`held`); a record already superseded (`apply`); a record whose token moved since (still `held`).
  - In `apps/worker/src/script/fix-transferability.ts`, per page of mismatches: read from `db` the `cosmo_transferable` rows of those ids, and from `indexer` the highest `transferability_update.block_number` of the tokens that have one. Leave `held` tokens out of `applyPage`. Under `APPLY=1`, apply `superseded` tokens' chain value with the rest, then mark their records in one app statement (`superseded_at = now()`, `superseded_block`). The dry run writes nothing.
  - In both runs, print "held by Cosmo" and "Cosmo record superseded" counts beside the totals. Update the header comment: its `APPLY=1` paragraph gains the hold rule.

  Read-only verified: a dry run with `LIMIT=2000` and `PGOPTIONS='-c default_transaction_read_only=on'` prints both new lines (0 before any record). `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.

## 5. Worker: confirmed serials as anchors

- [x] 5.1 Create `apps/worker/src/lib/cosmo-anchors.ts` (pure) and `cosmo-anchors.test.ts` (Decision 5):
  - Export `COSMO_ANCHOR_NOTE = "Cosmo objektNo from a connected account"`.
  - `mergeAnchors({ manual, confirmed, rows, batches })`, where `confirmed` are `{ tokenId, objektNo, observedAt }[]` of one collection. It returns `{ anchors, conflicts, refused }` by the table of Decision 5, walking confirmed serials in token order against the manual anchors, v1 serials and the confirmed anchors kept so far. Kept ones carry `COSMO_ANCHOR_NOTE` and `addedAt = observedAt`. `anchors` always holds every manual anchor unchanged.

  Tests cover:
  - every row of the table;
  - two confirmed serials in one unpinned batch (both kept);
  - an unpinned batch whose estimate already matches (kept);
  - a batch pinned by a manual anchor that agrees (dropped, no conflict) and one that disagrees (a conflict);
  - a batch pinned by a v1 serial, agreeing and disagreeing;
  - a confirmed serial that would push a neighbour below 1, and one outside every batch (`refused`);
  - that the manual anchors come back unchanged, and that an empty `confirmed` returns `manual` as is.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.
- [ ] 5.2 Every serial path reads both sources. Read `apps/worker/docs/offline-serials.md` first.
  - Create `apps/worker/src/job/confirmed-serials.ts` with `loadConfirmedSerials(slugs)`: one `db` query of eligible rows (Decision 5, The loader), grouped by slug, returning an empty map unless `objektWriteModes(process.env.COSMO_OBJEKT_WRITES).anchors`. It imports `db` and worker modules only.
  - Wherever `collection.serial_anchors` reaches `fitRanges`, `computeOfflineSerials`, `computeOfflineSerialUpdates` or `rewriteSerials`, pass `mergeAnchors` of it and the loaded confirmed serials: `job/populate-serial.ts`, `job/serial-batches.ts` (including the grid writes' anchor read), `job/verify-batch-boundaries.ts`, `script/refine-serial-batches.ts`, `script/anchor-gaps.ts` and `script/backfill-offline-serials.ts`. Load once per collection, or once per run where the path already reads many collections. The holdout calls that pass `[]` stay. `script/serial-anchor.ts` checks a new manual anchor against manual anchors and v1 serials only, and rewrites with the merged list. Every path reads the switch from its own env (Decision 5, The switch is per process); say so in each changed script's header comment.
  - Each merge adds its conflicts and refusals to the `serial-offline` heartbeat, and the run logs as Decision 11 says.

  Read-only verified, with approval for seeded local rows: seed eligible `cosmo_objekt` rows for real tokens of one offline post-cutoff collection whose batch has no anchor, one with its production serial and one one higher. Run `refine-serial-batches.ts` dry for that collection with `COSMO_OBJEKT_WRITES=anchors`: it lists the serials the merged anchor would move. Without the variable its output matches a run before this change. `import-boundary.test.ts` passes. Lint, typecheck and build pass for `worker`.
- [ ] 5.3 Add `applyConfirmedSerials()` to `job/confirmed-serials.ts`, and call it as the last step of `populateSerialOffline` (`job/populate-serial.ts`), after the collection loop, in its own try/catch that logs one `warn` on failure. It returns at once unless `anchors` is on.
  - From `db`: up to 20 `slug`s with `serial_due` rows whose `serial_eligible` is not false, observed in the last 30 days and `serial_checked_at` null or over 6 hours old, oldest `observed_at` first; then those rows.
  - Per slug, from `indexer`: the collection (`id`, `on_offline`, `slug`, `serial_batches`, `serial_anchors`), and every objekt `(id, serial, minted_at)` minted before `now − MINT_DELAY_MS` (export the constant from `populate-serial.ts`). Judge rows whose `serial_eligible` is null with `serialEligible`, and store those judgements in one app statement before the load. Then `loadConfirmedSerials`, `mergeAnchors` and `rewriteSerials`.
  - Then one app statement stores `serial_checked_at = now()`, and sets `serial_due = false` except on rows still unjudged. A 55P03 skips the slug for this run.
  - It never writes `collection.serial_anchors`.

  Read-only verified, with the seeded rows of 5.2: call `applyConfirmedSerials()` once from `bun -e` with `COSMO_OBJEKT_WRITES=anchors`. It logs (`debug`) the serials it would move, and the write fails at the read-only indexer. Without the variable it reads nothing. Lint, typecheck and build pass for `worker`.

## 6. The plan script

- [ ] 6.1 Create `apps/worker/src/script/cosmo-objekt-plan.ts` (Decision 10), read-only:
  - It refuses to start unless `SHOW default_transaction_read_only` is `on` for the indexer, as `fix-transferability.ts` does.
  - It reads every `cosmo_objekt` row (all of them, ignoring the due flags), runs `mergeAnchors` per slug as if `anchors` were on, and `judgeTransferable` per chunk with both directions on.
  - It prints per collection the serials the merge would move, with their count and range (`shiftedSerials`), the conflicts and refusals with token ids, and the online and v1 serials that differ from the indexer. Then the transferable outcomes by direction × non-transferable reason × class, the distinct `non_transferable_reason` values with counts, up to 10 sample token ids per direction, and the `cosmo_transferable` records split by whether a `transferability_update` above their `chain_height` exists (Decision 10).
  - An optional `SLUG=<slug>` narrows the serial part.

  Usage lines go in its header comment, as in `serial-anchor.ts`. Read-only verified: with the seeded rows of 4.2 and 5.2 on the local app database and `PGOPTIONS='-c default_transaction_read_only=on'`, it prints both reports. Without `PGOPTIONS` it refuses. Lint, typecheck and build pass for `worker`.

## 7. API and web

- [ ] 7.1 The estimate mark counts confirmed serials (Decision 8):
  - Create `packages/api/src/lib/confirmed-pins.ts` with the pure `pinnedByConfirmed(candidates, confirmed)`: `candidates` are `{ id, slug, start, end }[]`, `confirmed` are `{ slug, tokenId }[]`; it returns the ids whose `[start, end]` holds a confirmed token of the same slug. `confirmed-pins.test.ts` covers a hit, a confirmed token of another slug, one outside the range, range edges, and empty inputs.
  - In `packages/api/src/env.ts`, add `COSMO_OBJEKT_WRITES: z.string().optional()` to `serverEnv`.
  - In `packages/api/src/services/objekt/serial-anchored.ts`, `anchoredSerialIds(ids)`: when `objektWriteModes(serverEnv.COSMO_OBJEKT_WRITES).anchors`, extend the indexer query to also return, for each post-cutoff id it does not mark anchored, the collection's `slug` and the holding batch's `start` and `end`; then, if any exist, one `db` query `select slug, token_id from cosmo_objekt where serial_eligible and slug = any($1)`; add `pinnedByConfirmed`'s ids to the set. A failed app query logs `console.warn` with the error code and adds nothing. Without `anchors`, the function behaves as today. Update its doc comment, and `isSerialEstimated`'s in `@repo/lib/serial`, to name confirmed serials.
  - Callers (`services/offer/verify.ts`, `services/offer/picker/*`, `services/chat/cards.ts`) and response shapes are unchanged.

  Checks:
  - `bun test packages/api` passes.
  - With approved seeded local rows (task 5.2's eligible row for a production token of an unanchored offline batch) and `COSMO_OBJEKT_WRITES=anchors` in the web's env, on the local dev server the offer builder shows another objekt of that batch without "~"; without the variable it shows "~".
  - `import-boundary.test.ts` passes for `worker` (the worker does not import this service). Lint, typecheck and build pass for `@repo/lib`, `@repo/api` and `web`.
- [ ] 7.2 Replace `cosmo_session_intro`, `cosmo_session_read` and `cosmo_session_shown` in `messages/en.json`, `ko.json` and `ja.json` with Decision 9's text, and tell the owner the ko and ja texts are drafts for review. On the local dev server, `/account/collection-data` shows the new text above Connect in each locale. Lint, typecheck and build pass for `web`.

## 8. Review

- [ ] 8.1 Before the deploy (9.2), run `/code-review` and the `security-auditor` agent on the branch, against:
  - Decision 3 (no user, session or address on a row, no foreign key);
  - Decision 6 (every guard in both the plan and the `UPDATE`; `cosmo_transferable` stored only for `matched` and `written_*`; `fix-transferability` holds confirmed values);
  - Decision 5 (manual anchors and v1 serials win, nothing written to `collection.serial_anchors`, serial writes only under `serial-offline`);
  - Decision 7 (`disconnectSession`, `revokeSessionsOf`, `services/account/anonymize.ts` and `deleteLongDead` reach neither table, nothing deletes their rows, grid use and the non-transferable reason included, and no page or API response carries those two);
  - Decision 8 (the estimate mark adds confirmed pins only with `anchors` on, by the same eligibility the serial job loads);
  - Decision 10 (nothing written to the indexer, and no confirmed serial used, with the switch unset);
  - Decision 12 (`grep -rniwE 'lock|unlock|locked'` over the diff finds only the `serial-offline` job lock and SQL lock wording).

  Fix what they find, or record why not in design.md, Risks. Lint, typecheck and build pass for every package the fixes touch.

## 9. Rollout (owner)

- [ ] 9.1 **(owner)** Before the deploy, read-only on production: `select count(*) from cosmo_session where dead_at is null` and whether any of those rows belongs to an account other than the owner's. If any does, settle design.md's open question on old consent before 9.2. A reconnect rule is a `created_at` filter on the sessions whose pages `recordPage` records objekts from.
- [ ] 9.2 **(owner)** Apply the migration (2.2), deploy the web and the worker with `COSMO_OBJEKT_WRITES` unset, and press Sync now on the owner's account.
  - Check: the worker's `collection-media` summary shows `objekts recorded` near 182.
  - Check: `select transferable_outcome, count(*) from cosmo_objekt group by 1` on production shows outcomes and no `written_*`.
  - Check: the drawer and trade surfaces look as before (no grid use or reason anywhere, serial marks unchanged).
- [ ] 9.3 **(owner)** Run `cosmo-objekt-plan.ts` on production read-only.
  - Read the serial section: the Cream02 Double that was off by 1 should show its batch moving by 1, with no conflict.
  - If the serials look right, set `COSMO_OBJEKT_WRITES=anchors` in the root `.env` and restart the `worker` and `web` together. From then on, run the serial scripts with the same value (Decision 5, The switch is per process).
  - Within 10 minutes, `serial-offline` logs the collections rewritten, and the Cream02 Double shows its Cosmo serial with no "~" in the offer builder. `serial-anchor.ts list <slug>` is unchanged.
- [ ] 9.4 **(owner)** From the plan's transferable section, decide on `untransferable`, then `transferable`, and add each to `COSMO_OBJEKT_WRITES` with a restart.
  - Optionally re-arm earlier reads with `update cosmo_objekt set transferable_due = true where transferable_outcome like 'report_%'` (a production write).
  - Check the next `info` line's `written_*` counts against the plan, and that `cosmo_transferable` gained as many rows.
  - Record the decision on `transferable` in design.md, Open questions.
- [ ] 9.5 **(owner)** A week after 9.3, run `script/anchor-gaps.ts` read-only. For each new whole-block gap after anchorless batches, decide whether to run `script/refine-serial-batches.ts` (dry first, then `APPLY=1`), with the worker's `COSMO_OBJEKT_WRITES` value in its env.
- [ ] 9.6 **(owner)** Record in design.md, Open questions, from the first syncs and the plan: the `partial` count (is `objekts[]` complete?), any `inventory.status` other than `minted`, and every `non_transferable_reason` value seen. For a frequent new reason, open a follow-up for its label.

## 10. Docs

- [ ] 10.1 Update the agent docs. If task 11.1 of `cosmo-qr-collection-media` is still open, do it first, so these sections land beside its Collection media sections.
  - **`apps/worker/AGENTS.md`**:
    - A Cosmo objekt data section: recorded from the same pages, the holder and minted checks, the chain height, the due flags, rows kept for good (nothing deletes them) and untouched by disconnect or account deletion, grid use and the reason stored but not shown, `COSMO_OBJEKT_WRITES` read by worker and web and the plan script. Names follow Cosmo's terms (Decision 12).
    - The transferable guards, their two directions, and the permanent `cosmo_transferable` records.
    - The Transferability correction paragraph gains: `fix-transferability` holds Cosmo-confirmed values unless a newer chain change supersedes them.
  - **`apps/worker/docs/offline-serials.md`**: a bullet on confirmed serials. Covers the app table as the store, the trust rules, `mergeAnchors` (manual and v1 win, conflicts reported), every serial path loading them, the rewrite step in `populateSerialOffline` under the `serial-offline` job lock, the operator's exclusion and the re-arm rule, the switch read per process, rebuilds, online and v1 compared only, and gaps left to `anchor-gaps.ts` and the refine script. The bullet on `objektNo` being owner-only gains that connected accounts now supply it for their own objekts. The `anchoredSerialIds` bullet gains the confirmed pins, read from the app database under the same switch.
  - **`apps/indexer/AGENTS.md`** (Transferability at mint): the worker also writes `transferable` from Cosmo reads, under `fix-transferability`'s guards plus "not received since the read", and `fix-transferability` holds those values.
  - **`packages/db/AGENTS.md`**: a Cosmo objekt reads section. It covers the two token-keyed tables in the app database, with no user, session, address or foreign key; why they are not in the indexer database (survive a rebuild); `cosmo_objekt` as the store of confirmed serials; the due flags and partial indexes; and that both are kept for good.
  - **`packages/api/AGENTS.md`**: one line that `anchoredSerialIds` also reads `cosmo_objekt` from `db` and follows `COSMO_OBJEKT_WRITES`. **`apps/web/AGENTS.md`**: no change; say so in the summary.
  - **Root `AGENTS.md`**: the Environment list gains `COSMO_OBJEKT_WRITES`.

  `bun run check` and `bun run build` pass at the root, and `bun run format` leaves no diff.

## Workflow follow-up

- Archive `cosmo-qr-collection-media` before this change: this change's `web-cosmo-session` delta modifies a requirement that change adds, and archive refuses it otherwise.
- Archive this change with `/opsx:archive` once 9.2 to 9.4 are done.
- Follow-ups: show grid use and the non-transferable reason on the site (stored since this change; a reader treats them as current only while `received_at <= observed_at`), with labels for new reasons (9.6); lenticular pairs once something shows them.
