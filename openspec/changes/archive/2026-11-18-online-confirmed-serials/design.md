# Design

## Context

See proposal.md for why. The current state this design builds on:

- **Online numbering.** `populateSerial` (`apps/worker/src/job/populate-serial.ts`, lock `serial-online`, every 5 minutes) picks online collections, excluding `preAssignedCollections`, that hold a post-cutoff objekt with serial 0 minted before `now − MINT_DELAY_MS`. `processCollection` sorts the collection's objekts by token id and `computeOnlineSerials` (`lib/serial-math.ts`) recomputes every post-cutoff serial as `maxPre + rank`, keeping a deliberate head serial 0 (`headSkip`), then `writeSerialUpdates` writes the differences. Each run recomputes the whole collection, so a numbering that ignores anchors reverts any anchored serial the next time the collection mints.
- **Confirmed serials.** `cosmo-objekt-ownership-data` records each read in the app table `cosmo_objekt`. `serialEligible` (`lib/cosmo-objekts.ts`) returns false for online collections that are not pre-assigned; the upsert sets `serial_eligible` only on insert, on a changed `objekt_no` or `slug`, or while null (an operator's exclusion sticks), and sets `serial_due` only where eligibility is true or null. `applyConfirmedSerials` (`job/confirmed-serials.ts`, the last step of `populateSerialOffline`, lock `serial-offline`) takes up to 20 slugs with due rows, judges unjudged rows (false only), skips online collections, merges and rewrites offline ones, and settles their rows.
- **Switches.** `objektWriteModes` (`@repo/lib/cosmo-objekt-writes`) parses `COSMO_OBJEKT_WRITES`; production runs `anchors,untransferable,transferable`.
- **Data on 2026-11-18.** 1,494 recorded reads of post-cutoff online objekts, all `serial_eligible = false`, 1,479 of them still held by the reader; 55 differ from the indexer, each collection by one constant shift (`−327`, `−322`, `−315`, `−319`, `−330`, `−1`, `−1`); none shares a serial with another read.
- The app and indexer databases cannot join (`packages/api/AGENTS.md`).

## Goals / Non-Goals

**Goals:** the requirements in `specs/worker-online-serials`; one writer per online collection at a time; no schema change; online reads never delay offline confirmed serials.

**Non-Goals:** the estimate mark (`anchoredSerialIds` and `isSerialEstimated` stay as they are; `anchoredSerialIds` only considers collections with stored batches, which online ones lack, so every post-cutoff online serial still reads "~"); manual anchors for online collections; the offline merge.

## Decisions

### 1. A separate switch, `online-anchors`

`objektWriteModes` gains the word `online-anchors`. `anchors` is already on in production, so reusing it would move the 55 serials, and every later read, on deploy with no preview. A separate word lets the owner run the plan script first, as for every earlier word. Only the worker reads it; web never changes behaviour on it, since the mark is out of scope.

Eligibility is not behind the switch: with the word off, online reads are still judged eligible and stay due, untouched by either step (Decision 4), so turning it on needs no re-arm.

### 2. Eligibility: online post-cutoff counts

`serialEligible` drops the offline-or-pre-assigned test and keeps the rest: same slug, minted at or after `V1_CUTOFF_MS`, holder confirmed (`received_at` unchanged). A pre-cutoff read stays false, so v1 serials stay compare-only. Offline and pre-assigned rows judge exactly as before.

### 3. The numbering: anchors in `computeOnlineSerials`

`computeOnlineSerials(sorted, cutoffMs, headSkip, anchors)` takes `{ tokenId, serial }[]`. It walks post-cutoff tokens in token id order with a running serial: it starts at `maxPre + 1`; at an anchored token the running serial becomes the anchor's serial; every token takes the running serial, which then goes up by one. Tokens before the first anchor therefore keep mint order, a token after an anchor counts on from it, and two tokens can land on one serial.

A pure `onlineAnchors(confirmed, rows)` beside it (new `lib/online-anchors.ts`, tested) returns `{ anchors, conflicts, refused }`:

- refused: a token not among the collection's post-cutoff rows (minted within `MINT_DELAY_MS`, or the head serial 0), counted in the run's `warn` and retried, as offline refusals are;
- conflicts: when any confirmed token has a lower serial than one at a lower token id, every confirmed serial of the collection is a conflict and `anchors` is empty. Equal serials are not a conflict (Cosmo's double mints).

Alternative considered: one offset per collection taken from its anchors. Rejected: duplicates and the serials Cosmo uses without minting move the shift part-way through a collection, so a single offset is wrong on one side of the jump.

Alternative considered: the offline `mergeAnchors`. It is built on reserved batches, which online collections do not have.

### 4. One writer: the online job owns online collections

`populateSerial` stays the only writer of online serials, under `serial-online`:

- `processCollection` loads the collection's confirmed serials (`loadConfirmedSerials`, gated on `online-anchors` instead of `anchors` for online slugs) and passes `onlineAnchors(...)` to `computeOnlineSerials`, so a new mint never reverts an anchor.
- A new last step, `applyOnlineConfirmedSerials`, does for online collections what `applyConfirmedSerials` does for offline ones: due slugs, judge unjudged rows, rewrite, `markChecked`. Its rewrite is `processCollection` itself, which also covers a collection with no serial 0.
- `applyConfirmedSerials` leaves online rows alone instead of skipping them as settled: `confirmSlug` returns early for an online slug without stamping its rows.

**Only reads that would move a serial are due.** Recording already reads the indexer row of every token; it also reads `serial`, and sets `serial_due` on an eligible online row only when Cosmo's serial differs from it. A matching read is eligible and settled at once: it anchors every later rewrite of its collection (`loadConfirmedSerials` reads all eligible rows) but never queues one, since the numbering already agrees with it. On 2026-11-18 that is 54 due rows in 7 collections instead of 1,479 in 657.

**Each step reads the whole due pool.** With only moving reads due, the pool stays small (tens of slugs), so neither step bounds it with a window the other kind can fill: each selects every due slug, looks up `on_offline` and the pre-assigned list for them in one indexer query, and takes its own kind, oldest first, the offline step 20 as today, the online step 100. A connect that brings more than 100 drifted online collections takes one more 5-minute run per 100.

With `online-anchors` off, `applyOnlineConfirmedSerials` does nothing and due online rows wait for the word; the offline step never takes them.

Alternative considered: an `online` column on `cosmo_objekt` with its own partial index. It would split the pool without a lookup, but needs a migration, and once only moving reads are due the pool is small enough to split in memory.

### 5. One-off re-judge script

`script/cosmo-objekt-rejudge-online.ts` reads `cosmo_objekt` rows with `serial_eligible = false`, looks their tokens up in the indexer, and for online, non-pre-assigned tokens whose `serialEligible` is now true sets `serial_eligible = true`, and `serial_due = true` only where `objekt_no` differs from the indexer's serial, where the row still holds the `observed_at` it read. It touches no offline row, so its first run undoes no operator exclusion (online reads could never be excluded: they were never eligible). After that an operator may exclude an online read, which a re-run would flip back, so it is a one-off. Dry run by default with counts per collection; `APPLY=1` writes. 
### 6. The plan script

`script/cosmo-objekt-plan.ts` replaces its online compare-only list with the per-collection moves `computeOnlineSerials` would make with `onlineAnchors`, the shift range and the conflicts. It plans as if every word were on, as today, and judges online reads afresh, so it previews the moves before the re-judge writes anything. It loads a whole collection only when one of its post-cutoff reads differs from the indexer.

`script/check-serial-order.ts`, the manual sweep that renumbers every online collection from mint order under `--apply`, numbers with the same anchors, so it never undoes them.

## Risks / Trade-offs

- [A wrong Cosmo read moves a whole tail of a collection] → the backwards-run conflict rule, the plan preview before the word goes on, and `shiftedSerials` warnings on large moves, as offline rewrites log.
- [Tokens just before the first anchor are numbered from mint order while Cosmo's jump happened earlier] → they stay marked "~"; a read further down the collection moves the jump closer.
- [Two serial jobs on one collection] → removed by Decision 4: online serials have one writer.
- [Serials users already saw change] → expected; the drawer and Trade read the indexer, and the change is the correction.

## Migration Plan

1. Deploy worker and web with `online-anchors` unset; nothing moves. Web parses `COSMO_OBJEKT_WRITES` too, so the word goes into no environment before both run the new build, or the old build warns about an unknown word.
2. Owner runs the plan script on production read-only. It judges online reads afresh, so it shows the online moves before any write.
3. Owner runs the re-judge script dry, then `APPLY=1` (a production write needing the owner's approval).
4. Within 30 days of the reads (recorded 2026-11-17 and 18), since a due read observed longer ago than `DUE_WINDOW_MS` leaves the selection until its account syncs again, the owner adds `online-anchors` to the worker's `COSMO_OBJEKT_WRITES` and restarts it; within 10 minutes the 7 collections move (7 due slugs, one run).

Rollback: remove the word and restart the worker. Each collection goes back to mint order the next time it mints; one that never mints again keeps its anchored serials.

## Open Questions

- What the serials Cosmo used without minting are (the 327 in Atom02 HeeJin 101Z); answering it changes no rule here.
