import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunkMap } from "@repo/lib";
import { V1_CUTOFF_MS } from "@repo/lib/serial";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { unique } from "../../lib/unique";

const ANCHORED_BATCH = 500;

/**
 * The post-cutoff objekts whose reserved range also holds a serial Cosmo
 * supplied or a manual anchor. Reads anchoring the way the worker's
 * `computeOfflineSerials` pins a range, so the two must change together.
 */
export async function anchoredSerialIds(ids: string[]): Promise<Set<string>> {
  const cutoff = new Date(V1_CUTOFF_MS).toISOString();
  const rows = await chunkMap(unique(ids), ANCHORED_BATCH, (batch) =>
    indexer
      .select({ id: objekts.id })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          inArray(objekts.id, batch),
          gte(objekts.mintedAt, cutoff),
          isNotNull(collections.serialBatches),
          sql`exists (
            select 1 from jsonb_array_elements(${collections.serialBatches}) b
            where ${objekts.id}::bigint between (b->>'start')::bigint and (b->>'end')::bigint
              and (
                exists (
                  select 1 from ${objekts} a
                  where a.collection_id = ${collections.id} and a.serial > 0
                    and a.minted_at < ${cutoff}
                    and a.id::bigint between (b->>'start')::bigint and (b->>'end')::bigint)
                or exists (
                  select 1 from jsonb_array_elements(coalesce(${collections.serialAnchors}, '[]'::jsonb)) m
                  where (m->>'tokenId')::bigint
                    between (b->>'start')::bigint and (b->>'end')::bigint)))`,
        ),
      ),
  );
  return new Set(rows.map((row) => row.id));
}
