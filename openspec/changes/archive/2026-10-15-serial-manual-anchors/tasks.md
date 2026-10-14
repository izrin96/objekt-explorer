## 1. Schema

- [x] 1.1 Add `packages/db/indexer-migrations/<timestamp>_add_serial_anchors/migration.sql` with `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "serial_anchors" jsonb;`, written by hand (never `drizzle-kit generate` there). Add `serialAnchors: jsonb("serial_anchors").$type<{ tokenId: number; serial: number; note: string; addedAt: string }[]>()` beside `serialBatches` in `packages/db/src/indexer/schema.ts`. Do not apply the migration; the user does. Verify lint and typecheck pass for `@repo/db`.

## 2. Serial math (pure)

- [x] 2.1 In `apps/worker/src/lib/serial-math.ts`, add a required `manualAnchors: { tokenId: number; serial: number }[]` argument to `computeOfflineSerials` and `computeOfflineSerialUpdates`, merged into the per-batch anchor lists; on the same token the v1 serial wins (design: "Manual anchors merge…"). Pass `[]` in the existing tests. Add tests to `serial-math.test.ts`: the spec's 29519229 / 29519351 = 38 batch (29519329 → 16); a later anchorless batch chaining from the anchored one; an earlier batch unaffected; a v1 anchor and a manual anchor in one batch, each objekt taking the nearer one; a v1 serial never overwritten. Verify `bun test apps/worker/src/lib/serial-math.test.ts` passes.
- [x] 2.2 In the same module, add a pure `checkManualAnchor(rows, batches, anchor)` that returns the refusal reason or `null`, covering: serial below 1, token minted before the cutoff, no stored batches, token outside every batch, and an objekt in the anchored batch whose serial would fall below 1 (naming the token and its serial). Test each refusal, plus one accepted anchor. Verify `bun test apps/worker/src/lib/serial-math.test.ts` passes, and lint and typecheck pass for `worker` (they now fail at the callers until task 3).

## 3. Every serial write passes the anchors

- [x] 3.1 `job/populate-serial.ts`: select `serialAnchors` with the collection in `processCollectionOffline` and pass `serialAnchors ?? []` to `computeOfflineSerialUpdates`. Give `writeSerialUpdates` an optional transaction argument, keeping its own transaction when none is passed. Verify lint and typecheck pass for `worker`.
- [x] 3.2 `job/verify-batch-boundaries.ts`: select `serialAnchors`; make `isAnchored` also true for a batch holding a manual anchor's token; pass the anchors to the recompute after rediscovery. Verify lint and typecheck pass for `worker`, and `DRY_RUN=1 bun run --env-file=../../.env src/job/verify-batch-boundaries.ts` (read-only) completes with the same drift count as before, since no anchors exist yet.
  - Production dry run left to the user.
- [x] 3.3 `script/refine-serial-batches.ts`: pass the collection's anchors to the serial update, and `[]` explicitly in `holdoutExact` (it scores with ground truth hidden). `script/backfill-offline-serials.ts`: select and pass the anchors. Verify lint, typecheck and `bun run build --filter=worker` pass, and that the refine script's dry run (read-only) prints the same totals as before.
  - Production dry run left to the user.

## 4. Operator script

- [x] 4.1 Add `apps/worker/src/script/serial-anchor.ts` with `add <tokenId> <serial> <note…>`, `remove <tokenId>` and `list [slug]`, a header comment giving the run commands like the other scripts, dry run by default and writes only with `APPLY=1` (design: "One script…"). It refuses a token not in the indexer, or in a collection that is neither offline nor pre-assigned, and otherwise uses `checkManualAnchor`. With `APPLY=1`, it stores or removes the anchor and writes the serials in one indexer transaction, then reads them back and reports any remaining difference. `list` prints each anchor as a ready-to-run `add` command. Verify lint, typecheck and build pass for `worker`, and that a dry run of `add 29519351 38 "test"` (read-only) prints `cream02-hayeon-348a`, current serial 123, and 292 changes of −85. Do not run it with `APPLY=1`; the user does, after the migration is applied.
  - Production dry run left to the user.

## 5. Verify

- [x] 5.1 Run `bun run check` and `bun run knip` (no new unused exports). All pass.
- [ ] 5.2 Read-only check against production: dry runs of `add` for an unknown token, a pre-cutoff token and an online-collection token each refuse with their reason; `list` on a collection with no anchors prints nothing to add. Record the outputs.
  - Left to the user (production).
  - Skipped at archive (2026-10-15): the user has anchored serials with the tool in production and is satisfied it works.

## 6. AGENTS.md

- [x] 6.1 Update `apps/worker/AGENTS.md` "Offline serials": manual anchors are ground truth like v1 serials and live in `collection.serial_anchors`; every serial write must pass them (the required argument enforces it); add one with `script/serial-anchor.ts`, dry run first. Root `AGENTS.md` and `packages/db/AGENTS.md` need no change (the indexer migration rule already covers it); state that in the task note. Verify the edit with the `writing-for-agents` skill.
  - Root `AGENTS.md` and `packages/db/AGENTS.md` need no change (the indexer migration rule already covers it). Edited without invoking `writing-for-agents`, as instructed.
