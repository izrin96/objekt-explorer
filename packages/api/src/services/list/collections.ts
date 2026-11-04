import { toIndexedArtist, type ValidArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { chunkMap } from "@repo/lib";
import { overrideCollection } from "@repo/lib/server/objekt";
import { and, inArray } from "drizzle-orm";

import { getCollectionColumns } from "../objekt";
import { TOKEN_CHUNK_SIZE } from "../utils";

export async function fetchCollectionsBySlug(slugs: string[], artists: ValidArtist[]) {
  const uniqueSlugs = new Set(slugs);

  if (uniqueSlugs.size === 0) return [];

  const result = await chunkMap(Array.from(uniqueSlugs), TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({
        ...getCollectionColumns(),
      })
      .from(collections)
      .where(
        and(
          inArray(collections.slug, batch),
          ...(artists.length ? [inArray(collections.artist, artists.map(toIndexedArtist))] : []),
        ),
      ),
  );

  return result.map(overrideCollection);
}
