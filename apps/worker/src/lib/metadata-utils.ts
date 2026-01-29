import { fetchMetadataV1 } from "@repo/cosmo/server/metadata";

export async function fetchMetadata(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    console.log(`[fetchMetadata] Error fetching v1 metadata: ${error}`);
    return null;
  }
}
