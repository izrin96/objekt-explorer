# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=@repo/api`, `--filter=web`, and `--filter=worker`, which bundles `verify.ts`).

## 1. Pure rule

- [x] 1.1 Add `exactByOwnRead(reads, rows)` to `packages/api/src/lib/confirmed-pins.ts` (design Decision 1) with tests in `confirmed-pins.test.ts`; verify the tests cover a read shown as read (exact), a read whose shown serial differs (not), a pre-cutoff token (not), a token in a collection with batches (not), and a token with no indexer row (not).

## 2. The read

- [x] 2.1 Extend `anchoredSerialIds` (`packages/api/src/services/objekt/serial-anchored.ts`) with the online read source behind `onlineAnchors` (Decision 2): the app read in parallel with the indexer reads, the second indexer read only when reads were found, both branches of the `anchors` switch; verify typecheck, `apps/worker/src/import-boundary.test.ts` still passes, and a read-only call against production with `COSMO_OBJEKT_WRITES=online-anchors` returns token 27735402 as anchored and its next token in Atom02 HeeJin 101Z as not, and returns neither with the word off.

## 3. Integration

- [x] 3.1 Run `bun run check` from the root; verify lint, typecheck and test pass.

## 4. Docs

- [x] 4.1 Update `packages/api/docs/offers.md` (Estimated serials) with the online read-token case and its switch, and the `COSMO_OBJEKT_WRITES` line of `apps/worker/AGENTS.md` (`online-anchors` is now read by web too) and root `AGENTS.md` if it names readers; verify by reading each against the design.

## Workflow follow-up

- Owner, after deploy: add `online-anchors` to web's `COSMO_OBJEKT_WRITES` and restart web; check an offer holding token 27735402 reads "#1990" with no mark.
- Archive after `cosmo-objekt-ownership-data` and `online-confirmed-serials`.
