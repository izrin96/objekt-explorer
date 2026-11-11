# Design

## Context

See proposal.md (Why). The facts the approach depends on, checked on 2026-11-11:

- Cosmo mints through a wrapper contract (`0x569dcb79238866ba7198ee5b8c0c7a350f969218`, selector `0xab9b7136`). The wrapper calls `mint(address,uint256,bool)` / `mintBatch(address,uint256,uint256,bool)` on the objekt contract internally, so the indexer's existing filter on top-level transaction calldata never sees a mint.
- The SQD v2 archive has no Abstract dataset (`unknown dataset`), and production already reads every block over RPC (`INDEXER_SQD_ENDPOINT` is commented out, `INDEXER_RPC_RATE_LIMIT=10`).
- `https://api.mainnet.abs.xyz` answers `debug_traceBlockByNumber`, `eth_call` pinned by `{ blockHash }`, and JSON-RPC batches. Historical `eth_call` works back to the objekt contract's early state: `totalSupply()` reads 0 at 6,400,000 and 6,379,782 at 7,000,000.
- Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`) has been deployed since block 9,051,409. That is after the code default `START_BLOCK` (6,363,806) and before production's (78,305,516).
- The processor's context exposes the RPC client as `ctx._chain.client` (`@subsquid/evm-processor`, `Chain.client: RpcClient`). That client is the one that also ingests blocks. It counts each item of a JSON-RPC batch against `rateLimit` and caps a batch at `rateLimit / 5` items (`@subsquid/rpc-client` 4.15.1, `performRateLimitedScheduling`). At `INDEXER_RPC_RATE_LIMIT=10`, every extra call competes with ingestion.
- The generated ABI helpers already cover the call: `functions.isObjektTransferable` in `apps/indexer/src/abi/objekt/functions.ts` (`encode`, `decodeResult`).
- Worker replay (`apps/worker/src/lib/pending-replay.ts`, `planReplay`) already lets the latest pending `transferability_update` row win over the metadata value, ordered by `(block_number, transaction_index)`.

## Goals / Non-Goals

**Goals:**
- Every objekt the indexer records from now on carries the chain's transferability at its mint.
- Held mints carry the same value into the worker's replay, with no change to the worker.
- One script that finds and corrects the rows already wrong.

**Non-Goals:**
- Reading transferability on every transfer: after the mint, `batchUpdateObjektTransferability` remains the only on-chain change and is already indexed.

## Decisions

### Read `isObjektTransferable` at the mint block: one Multicall3 per mint block

For each chunk, collect the tokens whose transfer is a mint (`from` is the zero address) and group them by block. For each distinct block, make one `eth_call` to Multicall3 `aggregate3` with `allowFailure: true`, holding an `isObjektTransferable(tokenId)` call per token (encoded and decoded with the generated `functions.isObjektTransferable`). Pin it to that block by `{ blockHash }`, and send all of the chunk's calls through `ctx._chain.client.batchCall`. A failed entry counts as a failed read (see below), never as `false`.

The cost is one call per block that has mints, not one per token. That matters because the client counts each batch item against the 10/s limit it shares with ingestion. A call per token would add hours to every dense day of a resync, while a `mintBatch` puts its whole range in one block.

Below block 9,051,409 Multicall3 does not exist. There the module makes one `eth_call` per token, which only a resync from below production's `START_BLOCK` would reach.

Pinning by hash keeps a hot block's read on the fork being indexed, which matters because the processor runs with `supportHotBlocks`. The value read is the state at the end of the block. A `batchUpdateObjektTransferability` in the same block is also indexed as its own row with the same value, so the result is the same either way.

This needs the block hash on each parsed transfer, next to `blockNumber` and `logIndex`, and the log's `transactionIndex` for held mints (see below).

Alternatives considered:
- **Traces** (`addTrace` on calls to the objekt contract with the `mint`/`mintBatch` sighashes) would read the exact argument with no extra state call. With no SQD dataset, every block would have to be traced over RPC, including blocks with no mint. That roughly doubles each block's RPC cost under a 10/s limit, and slows a resync, which already takes a day.
- **Decoding the wrapper's calldata.** In one transferable and one non-transferable mint, the fourth word was `1` and `0`. But the wrapper's ABI is not published and Cosmo can change it without notice.
- **One `eth_call` per token**, everywhere. This is simpler, but with the client's per-item rate accounting it costs about as many calls as there are mints (566,500 on the densest day), all competing with ingestion.

### Held mints record a pending `transferability_update` row

When `decide` holds a mint, the indexer still has the chain value from the batch. It inserts a `transferability_update` row with the mint's `hash`, `blockNumber` and `transactionIndex`, the chain value, and `appliedAt = null`. Replay then applies it through the existing latest-wins rule, and any real change later in the chain outranks it by position. The worker's metadata guess is only reached when no row exists. After this change that happens only for mints held before deploy, which the correction script covers.

Alternative: a `transferable` column on `pending_transfer`. That would be clearer, but it means a schema change in both migration sets and a change to `planReplay`, while the existing table and rule already express "a transferability set at this chain position". The row is real chain data (the mint call's own argument), not an invented event.

### No fallback on a failed read

`RpcClient` retries on its own. If a read still fails, the handler throws, the batch rolls back and Subsquid restarts from the last committed block. Falling back to the class guess would silently bring back the exact bug being fixed.

### Correction script: `apps/worker/src/script/fix-transferability.ts`

It follows the shape of `replay-collection-colours.ts`: a dry run with plain reads until `APPLY=1`.

1. Pin one final block `B` (`squid_processor.status` height, then its hash from RPC), and note its timestamp.
2. Page through `objekt` by id, keeping only objekts minted at or before `B`'s timestamp, and skipping owner `Addresses.SPIN` and burned objekts (owner is the zero address). For each page, read `isObjektTransferable` at `B` through Multicall3 `aggregate3` with `allowFailure: true` (about 500 tokens per call). A failed entry is counted as skipped, never as `false`.
3. Report counts by class and direction, the skipped count, and a sample of ids.
4. With `APPLY=1`, update each mismatched row, but only where no `transferability_update` row has `block_number > B` for that token. A newer row means the indexer has already written something more recent.

At about 23.3M objekts and 500 per call, that is roughly 47k calls, about 80 minutes at 10/s.

## Risks / Trade-offs

- [RPC load during a resync: one call per block that has mints, on a client shared with ingestion] → At most one extra call per block, and only blocks with mints pay. Ingestion already makes several calls per block.
- [The public RPC trims old state] → Today it serves state back to the objekt contract's first blocks. If that changes, the reads fail loudly rather than guess, and `INDEXER_RPC_ENDPOINT` must point at an archive node.
- [The script and a live transferability update race] → The guard in step 4 leaves the newer write alone, and each batch the indexer runs re-applies its own updates.
- [About 140k rows stay wrong in production until `APPLY=1`] → A dry run first; the write needs the user's approval.

## Migration Plan

1. Deploy the indexer change. New mints are correct from the next block on.
2. Run the script dry against production with `PGOPTIONS='-c default_transaction_read_only=on'`, and review the counts with the user.
3. With approval, run it with `APPLY=1`. Then dry again to confirm only cosmo-spin objekts differ (they are skipped) and anything newer than `B`.

Rollback: revert the indexer deploy. Rows already written stay correct, since they match the chain.

## Open Questions

- Token 8107937 (First, `ever01-soomin-119z`, minted 2025-03-26, never moved) is `false` in the DB and `true` on chain, with no `transferability_update` row. Either it was indexed under an older normaliser and later made transferable before the indexer's history began, or some transferability changes reach the contract through a wrapper the way mints do, which the top-level transaction filter would miss. Recent `batchUpdateObjektTransferability` calls do arrive directly: the newest row is at block 89,019,783. The correction script fixes the row either way, and its dry run shows how common this direction is. If it is more than a handful, that becomes its own change.
