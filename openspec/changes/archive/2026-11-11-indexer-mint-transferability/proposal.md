# Proposal

## Why

The indexer sets an objekt's `transferable` at mint from Cosmo's metadata, but Cosmo's v3 metadata carries no such field: `normalizeV3` (`packages/cosmo/src/server/metadata.ts`) guesses it from the class (`Welcome` → false, everything else → true). An objekt minted non-transferable on chain gets no `batchUpdateObjektTransferability` call, so nothing ever corrects the guess.

A read-only comparison of production against `isObjektTransferable` on chain (block 89,019,884) shows the damage:

| Sample (owner not cosmo-spin) | Wrong: true in DB, false on chain | Wrong: false in DB, true on chain |
| --- | --- | --- |
| 2,254 objekts minted in the last 3 days | 220 (9.8%) | 0 |
| 1,854 random objekts | 18 (1%) | 1 |
| 1,500 random Welcome objekts | 0 | 1 |

Every wrong `true` is a First, Basic, Special or Event objekt minted since 2026-06-10, still with its mint receiver, and has no transferability update row. Welcome objekts are accurate. Cosmo-spin objekts read `false` in the DB and `true` on chain by design (the worker's `cosmo-spin` job).

## What Changes

- At mint, the indexer reads `isObjektTransferable(tokenId)` from the objekt contract at the mint's block, batched per chunk, and records that value instead of the metadata's.
- A held mint (no metadata yet) records the same chain value as a pending transferability change at the mint's position, so the worker's replay applies it through the existing "latest change wins" rule.
- A failed chain read fails the batch, which is retried. The indexer never falls back to the class guess.
- A one-off worker script compares every objekt not owned by cosmo-spin with the chain, reports the mismatches, and corrects them only with `APPLY=1`. Running it with `APPLY=1` against production needs the user's approval.

## Non-goals

- The cosmo-spin override (`updateTransferableCosmoSpin`) stays as it is.
- No web change: the objekt drawer's Transferable badge and the trade and offer filters read the corrected column as they are. No route changes.
- `normalizeV3` keeps its `transferable` guess for other readers. The indexer stops trusting it.
- No schema change and no migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indexer-objekts`: adds requirements that an objekt's transferability at mint comes from the chain, including for held mints, with no fallback to a guess.

## Impact

- `apps/indexer/src/main.ts`, `apps/indexer/src/parser.ts`: a batched chain read for each chunk's new mints and the pending row for held mints.
- `apps/worker/src/script/`: a new correction script. The replay job is unchanged, since it already applies pending transferability changes over the metadata value.
- RPC load: one Multicall3 `eth_call` per block that has mints, on the client the processor already uses.
- Production data: about 0.6% of the 23.3M objekts are estimated wrong (around 140k rows) until the script runs with `APPLY=1`.
