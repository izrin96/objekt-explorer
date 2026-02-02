import { FetchError, ofetch } from "ofetch";

import type { CosmoObjektMetadataV1, CosmoObjektMetadataV3 } from "../types/metadata";

/**
 * Fetch objekt metadata from the v1 API.
 */
export async function fetchMetadataV1(tokenId: string) {
  return await ofetch<CosmoObjektMetadataV1>(`https://api.cosmo.fans/objekt/v1/token/${tokenId}`, {
    retry: 4,
    retryDelay: 750, // 750ms backoff
  });
}

/**
 * Fetch objekt metadata from the v3 API.
 * Shouldn't be used as it doesn't contain full collection data.
 */
export async function fetchMetadataV3(tokenId: string) {
  return await ofetch<CosmoObjektMetadataV3>(
    `https://api.cosmo.fans/bff/v3/objekts/nft-metadata/${tokenId}`,
    { retry: 2, retryDelay: 500 }, // 500ms backoff
  );
}

/**
 * For indexer use.
 * If metadata endpoint down, just return empty metadata and it will refetch by worker later
 */
export async function fetchMetadata(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    const statusInfo = error instanceof FetchError ? ` (status: ${error.status})` : "";
    console.log(`[fetchMetadata] Error fetching v1 metadata${statusInfo}: ${error}`);
    return emptyMetadata(tokenId);
  }
}

/**
 * Empty metadata
 */
export function emptyMetadata(tokenId: string): CosmoObjektMetadataV1 {
  return {
    name: "empty-collection",
    description: "",
    image: "",
    background_color: "",
    objekt: {
      collectionId: "empty-collection",
      season: "",
      member: "",
      collectionNo: "",
      class: "",
      artists: [""],
      thumbnailImage: "",
      frontImage: "",
      backgroundColor: "",
      comoAmount: 0,
      tokenId: tokenId,
      // not possible to get from v3
      backImage: "",
      accentColor: "",
      textColor: "",
      objektNo: 0,
      tokenAddress: "",
      transferable: false,
    },
  };
}
