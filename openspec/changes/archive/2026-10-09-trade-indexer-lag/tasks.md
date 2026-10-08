## 1. Indexer head

- [x] 1.1 Check read-only on the indexer database that `squid_processor.status` and `squid_processor.hot_block` exist and hold heights, and record their columns. Check that `eth_getBlockByNumber` on `INDEXER_RPC_ENDPOINT` returns a timestamp for that height.
  - Verified 2026-10-08 (read-only session): `status(id, height, hash, nonce)` has one row (id 0); `hot_block(height, hash)`. Hot head 87193006 vs chain head 87193017 (9 s behind). `eth_getBlockByNumber` on api.mainnet.abs.xyz returns `timestamp` as hex seconds.
- [x] 1.2 Add `isBehind` to `lib/trade-match.ts`, with tests (design decision 2). Verify that `bun test packages/api/src/lib/trade-match.test.ts` passes, and that `@repo/api` lint and typecheck pass.
- [x] 1.3 Add `readIndexerHead()` to the trade verifier, writing `trade-verifier:seen`, and log the delay on each run. Verify by running the worker locally against production read-only: the log shows a delay of seconds, and the key holds a recent time. `worker` lint, typecheck and build pass.
  - Ran `readIndexerHead()` alone (read-only indexer session, local Redis): stored `{seenUntil, at}`, 8 s behind. The full worker was not started, since it also runs jobs that write. `docker-compose.yml` now passes `INDEXER_RPC_ENDPOINT` to the worker.

## 2. Holds

- [x] 2.1 Make `expireStalls` and `remindStalls` take `seenUntil`, and skip when it's unknown (decision 3). Verify by reading the SQL, and with a local database if available, otherwise record it as read-only verified. `worker` lint, typecheck and build pass.
  - On the local database: the due-selection is `accepted_at <= $1::timestamptz - make_interval(days => $2)`. With `seenUntil` = now, 0 of the 4 local in-progress trades are due; with a reading 30 days ahead, all 4 are. The update and notify paths were not run (read-only verified).
- [x] 2.2 Refuse `cancelTrade` with `indexer_behind` while behind, and add `seenUntil`, `indexerBehind` and `canCancel` to `TradeView` (decisions 4 and 5). Verify with `offer.trade`: with the Redis value set to an old time locally, `indexerBehind` is true and `canCancel` false, and the cancel request is refused at the boundary. `@repo/api` lint, typecheck and build pass.
  - On the local database and Redis, T-86: with a fresh reading, `canCancel` is true and `indexerBehind` false. With a reading 3 h old, `canCancel` is false, `indexerBehind` true, and `cancelTrade` is refused (`CONFLICT`, `indexer_behind`) before any write; the trade stayed in progress. `@repo/api` has no build script, and its lint, typecheck and tests (214) pass.

## 3. Trade page

- [x] 3.1 Render "transfers seen up to …" in `LegState`, show the warning notice in `trade-view.tsx`, and add the refusal text to `refusal.ts`, with en/ja/ko text. Verify at 1280 and 390 px with the indexer caught up (no notice) and with a stale value forced locally (the notice shows and Cancel is replaced by the sentence). Web lint, typecheck and build pass.
  - Checked on local dev (`/trade/mine/86` as shah). Caught up: no notice, Cancel shown, "transfers seen up to 2 minutes ago". Forced stale (local Redis, 3 h): the warning notice shows the viewer's local time, Cancel is replaced by "We can't see the latest transfers yet…", and the chip reads "seen up to 3 hours ago". At 1280 and 390 px the layout is intact, with scrollWidth 379 ≤ 390. Local Redis was reset afterwards.

## 4. Checks

- [x] 4.1 Run `bun run check` and `bun run build` from the root and verify both pass. Run `openspec validate trade-indexer-lag --strict` and verify it passes.
