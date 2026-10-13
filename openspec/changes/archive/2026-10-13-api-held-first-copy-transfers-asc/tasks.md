## 1. Held-by first-copy fields

- [x] 1.1 Add `minSerial`, `minSerialTokenId` and `firstReceivedAt` to `HeldFields` in `packages/lib/src/types/objekt.ts` and to `heldObjektSchema` in `packages/api/src/schemas/common/objekt.ts`; verify `bun run typecheck --filter=@repo/lib --filter=@repo/api` passes with the `satisfies` intact
- [x] 1.2 In `countHeld` (`packages/api/src/services/owned.ts`), aggregate `min(serial)` and `min(received_at)` in the `held` CTE, look up the lowest-serial token through a lateral `ORDER BY id LIMIT 1` probe, map `firstReceivedAt` to ISO, and cache only COSMO Spin's result, under the key `held-by:v2:${addr}`; verify by calling `GET /api/v1/objekts/held-by/{address}` on the dev server for a small collector and for COSMO Spin, checking `minSerial`/`firstReceivedAt` for one collection against `owned-by`
- [x] 1.3 Run `EXPLAIN ANALYZE` of the old and new `countHeld` statement for COSMO Spin (read-only) and record both timings in this task; verify the new one stays within the same order of magnitude
  - Recorded: old 3816 ms, new 6391 ms (single `EXPLAIN ANALYZE` run, Spin, 13017 collections, 13017 index probes); same order of magnitude
- [x] 1.4 Confirm the legacy `/api/objekts/held-by/$address` route and the profile's held view return and tolerate the new fields; verify the Spin profile page still renders on the dev server

## 2. Transfers order

- [x] 2.1 Add `order: z.enum(["desc", "asc"]).default("desc")` to `addressTransfersFiltersSchema` in `packages/api/src/schemas/transfers.ts`; verify typecheck passes and that `addressTransfersInputSchema.parse({ address })` yields `order: "desc"`
- [x] 2.2 Make `mergeSortedTransfers` take the direction, move it into a module with no DB imports, and add `*.test.ts` cases for both directions, including a row present in both inputs; verify `bun run test` passes
- [x] 2.3 In `services/transfers.ts`, apply the direction to the cursor filter (`lt`/`gt`), every `orderBy`, and the merge in both the plain and the collection-filter paths; verify on the dev server that `?order=asc` returns the earliest transfer first, and that following `nextCursor` for two pages gives strictly increasing `(timestamp, id)` with no repeats
- [x] 2.4 Read `order` in the legacy `apps/web/src/routes/api/transfers.$address.ts`; verify `/api/transfers/{address}?order=asc` matches `/api/v1/transfers/{address}?order=asc` and `?order=oldest` returns 400
- [x] 2.5 Verify the default path is unchanged: the response of `GET /api/v1/transfers/{address}` with no `order` matches a response captured before the change, for `type=all` and for a collection-filtered request

## 3. Document and checks

- [x] 3.1 Check `/api/v1/spec.json`: the held-by item schema names the three fields and `/transfers/{address}` lists `order` with enum `desc`, `asc` and default `desc`; verify by fetching the document from the dev server
- [x] 3.2 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build --filter=web` and verify all pass
