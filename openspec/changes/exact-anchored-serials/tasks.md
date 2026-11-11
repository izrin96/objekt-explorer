# Tasks

## 1. The rule

- [x] 1.1 In `packages/lib/src/serial.ts`, change `isSerialEstimated` to take `(mintedAt, anchored: boolean)`: estimated only when minted at or after the cutoff and not anchored. Add cases to `packages/lib/src/serial.test.ts` (pre-cutoff, post-cutoff anchored, post-cutoff unanchored, minted exactly at the cutoff). Verify: `bun test packages/lib/src/serial.test.ts` passes; lint and typecheck pass for `@repo/lib` (typecheck fails in `@repo/api` until group 2, which is expected).

## 2. The read and its call sites

- [x] 2.1 Add `packages/api/src/services/objekt/serial-anchored.ts` with `anchoredSerialIds(ids)` as in design.md (chunks of 500, empty input returns an empty set without a query). Verify read-only against production (`PGOPTIONS='-c default_transaction_read_only=on'`): for 60 recent objekts each of Winter26, Cream02 and Summer26 the counts read all, some and none, and the query stays under 200 ms.
- [x] 2.2 `shownSerials` in `services/offer/verify.ts` and the serial map in `services/chat/cards.ts` await `anchoredSerialIds` beside their serial query and pass the result to `isSerialEstimated`. Verify: typecheck passes for both files.
- [x] 2.3 `toCandidate` in `services/offer/picker/shared.ts` takes the anchored set; each caller in `picker/mine.ts`, `picker/theirs.ts` and `picker/index.ts` loads it once for the objekts it maps. Verify: no call to `isSerialEstimated` or `toCandidate` is left without the anchoring (`grep`), and `bun run lint`, `bun run typecheck` and `bun run build` pass for `@repo/api` and `web`.

## 3. Check in the running app

- [ ] 3.1 With the dev server on production's read-only indexer, open the offer builder's picker on a profile holding a Winter26 offline objekt minted after the cutoff and a Summer26 one. Verify: the Winter26 serial reads "#N" with no mark, the Summer26 one reads "~#N", and the estimate note shows once. Record it as read-only verified; send nothing.
  - Read-only verified 2026-11-11 as localtest1 on the local app database, nothing sent: the picker and the chosen item read "Mayu D309A #248" with no mark and no note (Divine01 309A, offline, minted after the cutoff, anchored range), the account's Cream02 online objekts read "~ estimated #5891", and pre-cutoff Binary02 ones read plain. Still open: the note showing once with an estimated objekt chosen (this account's estimated objekts are not transferable), and a Winter26 / Summer26 pair.

## 4. Documents

- [x] 4.1 Update `packages/api/docs/offers.md` where it describes serials shown on trade surfaces (or `packages/api/AGENTS.md` if that is where the rule belongs) with one line: `serialEstimated` comes from `isSerialEstimated` plus `anchoredSerialIds`, never from mint time alone. Add to `apps/worker/docs/offline-serials.md` that the API reads anchoring from `serial_batches`, `serial_anchors` and pre-cutoff serials, so a change to how a range is pinned changes the mark too. State in the task note that no other `AGENTS.md` changed. Verify: `bun run check` passes from the root.
