# Design

## Context

See proposal.md for why. Today:

- Trade surfaces mark a serial through `isSerialEstimated(mintedAt, anchored)` (`@repo/lib/serial`), with `anchored` from `anchoredSerialIds(ids)` (`packages/api/src/services/objekt/serial-anchored.ts`). Callers: the pickers (`services/offer/picker/*`), `services/offer/verify.ts` (also bundled by the worker, so the module reads `process.env`, never `env.ts`) and `services/chat/cards.ts`.
- `anchoredSerialIds` reads only collections with `serial_batches`: a range holding a v1 serial or a manual anchor, and with `anchors` on, a settled, agreeing confirmed serial (`pinnedByConfirmed`, `lib/confirmed-pins.ts`). Online collections have no batches, so they never reach it; the 6 online collections that do are the pre-assigned ones, which number like offline.
- The worker writes an online read's serial onto `objekt.serial` (`online-confirmed-serials`). A read left out as a conflict, or not yet applied, leaves the shown serial different from the read.

## Goals / Non-Goals

**Goals:** the scenarios in `specs/web-trade-offers`; no change to what any caller passes or receives; one extra round trip at most, only when an asked id has a read.

**Non-Goals:** marking counted-on tokens; the drawer; offline objekts.

## Decisions

### 1. Exact means "read, and shown as read"

An online post-cutoff token is exact when `cosmo_objekt` holds an eligible read of it and the indexer's `objekt.serial` equals that read's `objekt_no`. The equality replaces the offline path's "settled" test (`serial_due` off): it covers a read not yet applied and a read the worker left out as a conflict in one check, and it can never call a serial exact that the page does not show.

Alternative considered: `serial_due` off alone, as the offline pins use. Rejected: a collection whose reads conflict settles its rows while showing mint order, which would mark a wrong serial exact.

### 2. Where it runs

`anchoredSerialIds` gains a third source, beside the two it has, behind `objektWriteModes(process.env.COSMO_OBJEKT_WRITES).onlineAnchors`:

1. The app read of eligible reads for the asked ids (`token_id = any(ids)`, through `chunkMap`) starts in parallel with the existing indexer reads.
2. When it finds any, one indexer read (`id = any(readIds)`, joined to `collection`) returns those tokens' `serial`, `minted_at` and whether their collection has no `serial_batches` (an online collection that is not pre-assigned).
3. The pure `exactByOwnRead(reads, rows)` (in `lib/confirmed-pins.ts`, tested) returns the ids that are post-cutoff, online, and shown as read; they join the result set.

The existing early-return path (`anchors` off) is restructured so step 1 still runs beside it when `online-anchors` is on.

Alternative considered: a flag column on `objekt` written by the worker. Rejected, as discussed for `online-confirmed-serials`: a second copy of the read's fact in the indexer, lost on a rebuild; the indexer rework (`design/backlog.md`) is where such a flag would go.

### 3. The switch

Web reads `COSMO_OBJEKT_WRITES` itself, so the mark changes only once web's environment carries `online-anchors`. The worker already has it, and the worker's use of the mark (wrong-copy notes through `verify.ts`) follows the same word.

## Risks / Trade-offs

- [A read that is wrong at Cosmo's end shows as exact] → it is Cosmo's own number for the token, which is what the mark promises: what Cosmo shows.
- [One more sequential round trip on trade reads] → only when an asked id has a read; the app read itself runs in parallel.

## Migration Plan

Deploy web and worker; add `online-anchors` to web's `COSMO_OBJEKT_WRITES` and restart web. Rollback: remove the word from web.
