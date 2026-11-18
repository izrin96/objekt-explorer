# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=worker`, `--filter=@repo/lib`, `--filter=web` where `@repo/lib` changes).

## 1. The switch

- [x] 1.1 Add `online-anchors` to `WORDS` and the result of `objektWriteModes` (`packages/lib/src/cosmo-objekt-writes.ts`); verify a test parses `"anchors,online-anchors"` into both flags and no unknown word, and `"anchors"` alone leaves `onlineAnchors` false.

## 2. Pure numbering

- [x] 2.1 Change `serialEligible` (`apps/worker/src/lib/cosmo-objekts.ts`) to accept online post-cutoff tokens (design Decision 2); verify `cosmo-objekts.test.ts` covers an online post-cutoff read (true), an online pre-cutoff read (false), another slug (false), a moved token (null), and that offline cases are unchanged.
- [x] 2.2 Add `onlineAnchors(confirmed, rows)` in `apps/worker/src/lib/online-anchors.ts` (Decision 3) with `online-anchors.test.ts`; verify tests cover a token not in the rows (refused), the head serial 0 (refused), a backwards pair (every read a conflict, no anchors), and equal serials (both anchor).
- [x] 2.3 Give `computeOnlineSerials` (`apps/worker/src/lib/serial-math.ts`) an `anchors` argument (Decision 3); verify `serial-math.test.ts` covers every scenario of the spec's "Confirmed serials anchor online collections" and "Online serials may repeat", that tokens before the first anchor keep mint order, that `headSkip` and pre-cutoff serials are untouched, and that no anchors gives today's result.

## 3. The online job

- [x] 3.1 Gate `loadConfirmedSerials` (`apps/worker/src/job/confirmed-serials.ts`) per kind: offline callers on `anchors`, online callers on `online-anchors`; verify by reading every call site that no offline path reads online anchors and the reverse.
- [x] 3.2 In `processCollection` (`apps/worker/src/job/populate-serial.ts`), load the collection's confirmed serials and pass `onlineAnchors(...)` to `computeOnlineSerials`; record conflicts and refusals in a tally reported once per run as one `warn` (counts and token ids at `debug`); verify typecheck and that with the word off the call passes no anchors.
- [x] 3.3 In recording (`apps/worker/src/job/collection-media/objekts.ts` and its indexer read), read the token's `serial` and set `serial_due` on an eligible online row only when `objekt_no` differs from it (Decision 4); verify a test of the pure due rule covers matching, differing, offline and v1 rows.
- [x] 3.4 Split due-slug selection by kind (Decision 4): every due slug, one indexer lookup of `on_offline` and the pre-assigned list, the offline step's 20 and the online step's 100 of their own kind, oldest first (`applyDue`); an online slug never reaches `confirmSlug`, whose online guard stays only for a collection whose kind changes; verified on the local app database that a due offline and a due online slug each reach only their own step.
- [x] 3.5 Add `applyOnlineConfirmedSerials` as the last step of `populateSerial` under its `serial-online` lock: judge unjudged rows (false only), rewrite through `processCollection`, `markChecked`; do nothing while `online-anchors` is off; verified by typecheck and the local due-step run, and by the plan script, which numbers with the same functions and lists the 7 collections found on 2026-11-18 (the job itself only runs once the word is on).

## 4. Scripts

- [x] 4.1 Add `apps/worker/src/script/cosmo-objekt-rejudge-online.ts` (Decision 5): a dry run refuses writable connections, prints counts per collection, `APPLY=1` writes only online non-pre-assigned rows still at the `observed_at` it read, with `serial_due` only where `objekt_no` differs from the indexer's serial; the read-only dry run on production on 2026-11-18 reported 1,479 reads made eligible in 657 collections, 54 due in 7 (15 reads were of tokens moved since, so stay not eligible).
- [x] 4.2 Plan online moves per collection in `apps/worker/src/script/cosmo-objekt-plan.ts` (Decision 6), judging online reads afresh so the preview needs no write, and give `script/check-serial-order.ts` the anchors so a manual sweep never undoes them; the read-only plan on production lists the 7 collections, Atom02 HeeJin 101Z moving by 327.

## 5. Integration

- [x] 5.1 Run `bun run check` from the root; verify lint, typecheck and test pass.

## 6. Docs

- [x] 6.1 Update `apps/worker/AGENTS.md` (Cosmo objekt data: confirmed serials now cover online post-cutoff tokens, the `online-anchors` word, one writer per online collection, the re-judge script) and the root `AGENTS.md` `COSMO_OBJEKT_WRITES` line and `.env.example` with the new word; verify by reading each against the design.

## Workflow follow-up

- Owner, after deploy with `online-anchors` unset: run the plan script read-only; run the re-judge script dry, then `APPLY=1` (production write, owner's approval); add `online-anchors` to the worker's `COSMO_OBJEKT_WRITES` and restart it within 30 days of the reads, recorded 2026-11-17 and 18 (a due read observed longer ago leaves the selection until the account syncs again); within 10 minutes check the 7 collections against Cosmo.
- Archive `cosmo-objekt-ownership-data` before archiving this change.
