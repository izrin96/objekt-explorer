## Context

`fetchHeldObjekts` (`packages/api/src/services/owned.ts`) serves held-by from a five-minute
Redis entry per owner, `held-by:${addr}`, built by `countHeld`: a CTE groups the owner's
`objekt` rows by `collection_id` with `count()`, then joins `collection`. It exists for
owners too large to list token by token. COSMO Spin holds millions of copies across every
collection, so whatever is added must stay a single grouped pass.

`fetchAddressTransfers` (`services/transfers.ts`) pages 150 rows by a `(timestamp, id)`
cursor, newest first. `type=all` runs a `from = addr` and a `to = addr` query in parallel
and merges them with `mergeSortedTransfers`; with collection facets it first selects IDs,
then loads the rows. Indexes `idx_transfer_from_ts_id` and `idx_transfer_to_ts_id` are
`(address, timestamp desc, id desc)`.

## Goals / Non-Goals

**Goals:**
- Held-by gains the three fields at roughly the cost it has today, Spin included.
- `order=asc` reuses the existing queries and indexes; the default path stays byte-for-byte
  the same.

**Non-Goals:**
- No new index or migration. No new endpoint or service.

## Decisions

**Aggregate in the existing group, then look up one token per collection.**
The `held` CTE adds `min(serial) as min_serial` and `min(received_at) as first_received_at`
to its `count()`. They ride the same hash aggregate, so the scan is unchanged. The token ID
comes from a `LEFT JOIN LATERAL (SELECT id FROM objekt WHERE collection_id = held.collection_id
AND serial = held.min_serial AND owner = addr ORDER BY id LIMIT 1)`, one probe of
`idx_objekt_collection_serial` per collection. `(collection_id, serial)` has no unique
constraint, so the `ORDER BY id LIMIT 1` makes a duplicate deterministic.
- *Alternative:* `(array_agg(id ORDER BY serial, id))[1]` in the group. One statement,
  but for Spin it sorts and buffers every token ID per collection. Rejected.
- *Alternative:* `DISTINCT ON (collection_id) … ORDER BY collection_id, serial, id` plus
  window counts. Needs a full sort of the owner's rows instead of a hash aggregate. Rejected.

`firstReceivedAt` is normalised with `new Date(...).toISOString()`, as `mapOwnedObjekt`
does for `receivedAt`, so every surface returns the same ISO format.

**Version the cache key.** The key becomes `held-by:v2:${addr}`. Otherwise, for five
minutes after deploy, cached rows without the new fields fail the output schema or reach
clients without them. Old keys expire on their own.

**Types.** `HeldFields` (`packages/lib/src/types/objekt.ts`) gains `minSerial: number`,
`minSerialTokenId: string`, `firstReceivedAt: string`, and `heldObjektSchema` extends to
match, keeping its `satisfies z.ZodType<HeldObjekt>`. `GridObjekt` takes
`Partial<HeldFields>`, so grid code is unaffected.

**`order` on the filters schema.** `addressTransfersFiltersSchema` gains
`order: z.enum(["desc", "asc"]).default("desc")`. It is in the filters schema, not just
the `/rpc` input, so the legacy route and `TransfersParams` get it too. An old `/rpc` input
without `order` parses to `desc` and still validates.

**One direction switch in the service.** A small helper picks `lt`/`gt` for the cursor and
`desc`/`asc` for `timestamp` and `id`, and the four places that build the cursor filter or
`orderBy` use it: the plain query, the ID query, the row reload after the ID query, and the
`collection.slug` path. `mergeSortedTransfers` takes the direction and flips its comparison.
Its dedupe of the shared row stays the same. Postgres scans the existing
`(address, ts desc, id desc)` indexes backward for `asc`, so no index is added.
- *Alternative:* fetch `desc` and reverse in memory. Wrong for paging. Rejected.

**Legacy routes.** `/api/transfers/$address` reads `params.get("order") ?? undefined` into
the schema. `/api/objekts/held-by/$address` returns `fetchHeldObjekts` as is, so the fields
arrive with no change.

## Risks / Trade-offs

- [Spin's held-by pass gets a lateral probe per collection] → It is one indexed lookup per
  collection, thousands in all, against a scan of millions. Compare `EXPLAIN ANALYZE` of the
  old and new statement for Spin before merging.
- [`asc` with `type=all` reads the oldest 151 rows from each side, which for an old account
  means walking an index from its start] → That is a backward scan of the same index the
  `desc` path uses, so it costs the same.
- [`firstReceivedAt` is when the copy last arrived, not when the address first ever owned
  it] → That is what "first copy they still hold" asks for. The spec says so, so a copy sent
  away and received back counts from its return.
