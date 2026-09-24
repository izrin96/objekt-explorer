import { ownedBySchema } from "@repo/api/schemas/owned-by";
import { getCollectionColumns } from "@repo/api/services/objekt";
import { isAddressHiddenFromCaller } from "@repo/api/services/privacy";
import { getCache } from "@repo/api/services/redis";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import type { IndexedObjekt } from "@repo/lib/types/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { count, eq, ne } from "drizzle-orm";

const CACHE_TTL = 60 * 5;

const heldBySchema = ownedBySchema.pick({ artist: true });

/**
 * Held copies counted per collection, for an owner too large to list token by
 * token (COSMO Spin holds millions). Copies are grouped before the join, so
 * only one row per collection meets the collection table.
 */
async function countHeld(addr: string): Promise<IndexedObjekt[]> {
  const held = indexer.$with("held").as(
    indexer
      .select({ collectionId: objekts.collectionId, copies: count().as("copies") })
      .from(objekts)
      .where(eq(objekts.owner, addr))
      .groupBy(objekts.collectionId),
  );

  const results = await indexer
    .with(held)
    .select({ collection: getCollectionColumns(), copies: held.copies })
    .from(held)
    .innerJoin(collections, eq(collections.id, held.collectionId))
    .where(ne(collections.slug, "empty-collection"));

  return results.map((row): IndexedObjekt =>
    Object.assign(overrideCollection(row.collection), { copies: row.copies }),
  );
}

export const Route = createFileRoute("/api/objekts/held-by/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const addr = params.address.toLowerCase();
        const url = new URL(request.url);
        const parsed = heldBySchema.safeParse({
          artist: url.searchParams.getAll("artist").length
            ? url.searchParams.getAll("artist")
            : undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: "Invalid query parameters" }, { status: 400 });
        }

        if (await isAddressHiddenFromCaller(addr)) {
          return Response.json({ collections: [] });
        }

        // one entry per owner, whatever the artist scope, so every visitor shares it
        const all = await getCache(`held-by:${addr}`, CACHE_TTL, () => countHeld(addr));
        const artists = parsed.data.artist?.map((a) => a.toLowerCase());

        return Response.json({
          collections: artists?.length
            ? all.filter((collection) => artists.includes(collection.artist.toLowerCase()))
            : all,
        });
      },
    },
  },
});
