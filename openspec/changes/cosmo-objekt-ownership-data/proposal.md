# Proposal

## Why

The collection-media sync (change `cosmo-qr-collection-media`) already reads every page of `GET api.cosmo.fans/bff/v3/objekt-summaries` for each connected account, and drops each collection's `objekts[]`. Those entries carry what only an objekt's holder sees: Cosmo's own serial (`objektNo`), whether Cosmo lets it be sent (`transferable`, with `nonTransferableReason`) and whether it was used for a grid (`usedForGrid`). Offline serials minted after the v1 cutoff are estimates until an anchor pins their batch, and the owner reports `transferable` wrong for some objekts. The same pages can correct both at no extra Cosmo cost, and the corrections are facts about tokens worth keeping for good.

## What Changes

- The sync keeps each `objekts[]` entry it already receives, with no extra Cosmo request, in a new app table keyed by token id: Cosmo's serial, transferable flag, non-transferable reason, grid use, the indexer height at the read, and when it was read. No user, session or address is stored with it, and an entry is kept only when Cosmo and the indexer both name the connected account as the holder.
- Serial anchors (this project's own concept, not a Cosmo term): a recorded serial of an offline post-cutoff objekt that passes the trust rules is a confirmed serial, and the serial job (populate, the grids, the verifier, the refine script) reads confirmed serials from the app table beside the manual `collection.serial_anchors` as anchors, rewriting the collection's serials when new ones arrive. Nothing is copied into `serial_anchors` and the indexer's `objekt` gains no column. Manual anchors and v1 serials win; a disagreement is reported. Online and v1 serials are compared and reported only.
- Transferable: the sync's apply phase writes Cosmo's value onto the indexer's `objekt.transferable` when the objekt has not moved since the read and no chain change is newer, and keeps the Cosmo-confirmed value in a permanent table. `fix-transferability` never reverts a confirmed value unless a newer on-chain change exists. Writes ship report-only; the owner turns on each direction (`untransferable`, `transferable`) after reading the counts.
- Permanence: everything recorded per token (serial, transferability, grid use, non-transferable reason), the Cosmo-confirmed transferable values, and the serials and indexer corrections written from them stay for good; nothing in the new tables is ever deleted, and an indexer rebuild anchors on the confirmed serials again. Disconnecting, a session ending, a ban, or an account anonymize or delete removes none of them, since none is tied to an account.
- The estimate mark: trade surfaces stop marking a serial "~" when its batch is pinned by a confirmed serial, exactly as for a manual anchor, under the same `anchors` switch as the serial job. Grid use and the non-transferable reason are stored but shown nowhere yet.
- The Collection data section's consent text says what is kept per objekt, that it stays after disconnecting, that grid use and the reason are not shown yet, and what others see.
- This feature uses Cosmo's terms (transferable, non-transferable reason) and never touches Objekt Tracker's own lock feature.

## Capabilities

### New Capabilities

- `worker-cosmo-objekt-data`: recording the per-objekt data connected accounts return, correcting transferability from it, and keeping the facts it confirms for good.

### Modified Capabilities

- `worker-offline-serials`: serial anchors from connected accounts.
- `web-trade-offers`: confirmed serials count as anchored in the estimate mark.
- `web-cosmo-session`: the consent text (a requirement added by `cosmo-qr-collection-media`, which must be archived first).

## Impact

- **Routes:** every trade surface showing a serial (offer builder, chat cards, My trades, the trade page), and `/account/collection-data` (consent text). No API response gains a field.
- **Packages:** `packages/cosmo` (parsing `objekts[]`), `packages/lib` (the shared switch parser), `packages/db` (two app tables, one generated migration), `packages/api` (`anchoredSerialIds`, `serverEnv`), `apps/worker` (the sync, the apply phase, every serial path, `fix-transferability`), `apps/web` (consent strings).
- **Data:** indexer writes to `objekt.serial` and `objekt.transferable`, through the guards the worker already uses for each. `collection.serial_anchors` stays manual. No indexer schema change.
- **Ops:** the migration, turning transferable writes on, and a refine of anchored collections are owner steps.

## Non-goals

- Cosmo's minted and acquired dates: the chain already gives `minted_at` and `received_at`.
- Lenticular pairs: nothing on the site would show them yet.
- Rerunning range discovery or the drop grid when an anchor lands; a gap an anchor exposes is closed by the owner's refine run.
- Online serials and v1 serials: compared and reported, never written.
- Showing grid use or the non-transferable reason on the site (a follow-up).
- Showing which account a per-objekt read came from, or Cosmo's view of objekts no connected account holds.
- Extra Cosmo requests, a class filter, or a faster sync cadence.
