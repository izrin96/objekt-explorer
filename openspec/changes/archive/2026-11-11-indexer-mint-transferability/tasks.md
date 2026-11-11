# Tasks

## 1. Chain read at mint (indexer)

- [x] 1.1 Carry the block hash and the log's `transactionIndex` on each parsed transfer in `apps/indexer/src/parser.ts`, next to `blockNumber` and `logIndex`; verify that lint, typecheck and build pass for `indexer`
- [x] 1.2 Add the Multicall3 `aggregate3` ABI under `apps/indexer/src/abi/`, and a pure module `apps/indexer/src/mint-transferability.ts`. The module picks a chunk's mints, groups them by block, and builds one `aggregate3` call per block pinned by `{ blockHash }` (one `isObjektTransferable` call per token below block 9,051,409), using the generated `functions.isObjektTransferable` to encode and decode. It turns the results into a `tokenId → boolean` map and throws on any failed entry or missing result. Cover it in `mint-transferability.test.ts` (mint vs non-mint, grouping by block, the pre-Multicall3 path, a failed entry throws); verify with `bun test` in `apps/indexer`, and that lint, typecheck and build pass for `indexer`
- [x] 1.3 In `main.ts`, read the map once per chunk through `ctx._chain.client.batchCall` before the loop, and set `transferable` in `newObjekt` from it in place of `metadata.objekt.transferable`; verify that lint, typecheck and build pass for `indexer`
- [x] 1.4 For a held mint, insert a pending `TransferabilityUpdate` (mint `hash`, `blockNumber`, `transactionIndex`, chain value, `appliedAt: null`) alongside the `PendingTransfer`. Verify that `planReplay`'s existing tests cover a pending row winning over the metadata value, and that lint, typecheck and build pass for `indexer`
- [x] 1.5 Run the indexer locally against a local database from a block shortly before mint tx `0x0fc0445288f2631284134facf5cba8456a85573601a5ee8d2780117ed1f364bb` (`START_BLOCK` override), and confirm tokens 30938969 and 30938970 are recorded `transferable = false`; lint, typecheck and build pass for `indexer`

## 2. Correction script (worker)

- [x] 2.1 Add `apps/worker/src/script/fix-transferability.ts` as in design.md: pin a final block `B`; page objekts minted by `B`, skipping cosmo-spin and burned ones; read them through Multicall3 `aggregate3` with `allowFailure: true` (a failed entry counts as skipped); report mismatches by class and direction; write only with `APPLY=1` and the newer-update guard. Put the call encoding and comparison in a pure module with a `bun test` beside it; verify that lint, typecheck, test and build pass for `worker`
- [x] 2.2 Run it dry against production with `PGOPTIONS='-c default_transaction_read_only=on'`. Confirm the counts agree with the proposal's sample (about 1% wrong `true` across all objekts, about 10% among recent mints, Welcome near zero), and report them to the user along with the count in the `false`-in-DB direction (design.md, Open Questions). Read-only verified; `APPLY=1` waits for the user's approval. Lint, typecheck and build still pass for `worker`
  - Done on a sample, read-only verified at block 89,021,014 (2026-11-11), since a full pass takes about 5.5 h: a random 0.05% (7,707 objekts) had 162 `true` in DB / `false` on chain (2.10%: First 108, Basic 49, Special 3, Double 2) and 19 `false` in DB / `true` on chain (0.25%, all First, ids 7M to 10M); every objekt minted in the 3 days before (45,119) had 4,101 and 1 (9.09% and 0.00%); Welcome had none. The all-objekts rate is about twice the proposal's 1%. `APPLY=1` reads every objekt itself, so it needs no full dry run first.

## 3. Docs

- [x] 3.1 Update `apps/indexer/AGENTS.md`: transferability at mint comes from `isObjektTransferable` at the mint block through Multicall3, never from metadata, and a resync needs an RPC with state back to `START_BLOCK`. Add the script to `apps/worker/AGENTS.md` beside `replay-collection-colours.ts`. Verify that both files name the script and the rule, and that lint, typecheck and build pass for `indexer` and `worker`

## Workflow follow-up

- With the user's approval, run `fix-transferability.ts` with `APPLY=1` against production, then a second dry run.
- Archive the change once it is deployed and the correction has run.
