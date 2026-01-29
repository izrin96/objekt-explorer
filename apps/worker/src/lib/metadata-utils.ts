import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";

import { fetchMetadataV1, fetchMetadataV3 } from "@repo/cosmo/server/metadata";
import { normalizeV3 } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { slugifyObjekt } from "@repo/lib";
import { eq } from "drizzle-orm";

async function enrichWithCollectionData(
  metadata: CosmoObjektMetadataV1,
): Promise<CosmoObjektMetadataV1> {
  const slug = slugifyObjekt(metadata.objekt.collectionId);

  const [collection] = await indexer
    .select({
      backImage: collections.backImage,
      accentColor: collections.accentColor,
      textColor: collections.textColor,
      contract: collections.contract,
    })
    .from(collections)
    .where(eq(collections.slug, slug));

  if (!collection) return metadata;

  return {
    ...metadata,
    objekt: {
      ...metadata.objekt,
      backImage: collection.backImage,
      accentColor: collection.accentColor,
      textColor: collection.textColor,
      objektNo: 0, // v3 metadata doesn't include serial numbers
      tokenAddress: collection.contract,
      transferable: false, // v3 metadata doesn't include transfer status
    },
  };
}

export async function fetchMetadata(tokenId: string): Promise<CosmoObjektMetadataV1 | null> {
  const v1Response = await fetchMetadataV1(tokenId);

  if (v1Response.ok && v1Response._data) {
    return v1Response._data;
  }

  // if not 404 error, just return null and try again next time because service probably down
  if (v1Response.status !== 404) {
    console.log(`[fetchMetadata] Error fetching v1 metadata (status: ${v1Response.status})`);
    return null;
  }

  // if 404 error, proceed with v3
  console.log(
    `[fetchMetadata] Error fetching v1 metadata (status: ${v1Response.status}). Trying with v3..`,
  );

  const v3Response = await fetchMetadataV3(tokenId);

  if (!v3Response.ok || !v3Response._data) {
    console.log(`[fetchMetadata] Error fetching v3 metadata (status: ${v3Response.status})`);
    return null;
  }

  const metadata = normalizeV3(v3Response._data, tokenId);
  return await enrichWithCollectionData(metadata);
}
