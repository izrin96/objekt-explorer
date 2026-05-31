import { fetchMetadataV1, fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";

export async function safeFetchMetadataV1(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    console.error(`[fetchMetadata] Error fetching v3 metadata`);
    return null;
  }
}

export async function safeFetchMetadataV3(tokenId: string) {
  try {
    const metadata = await fetchMetadataV3(tokenId);
    return normalizeV3(metadata, tokenId);
  } catch (error) {
    console.error(`[fetchMetadata] Error fetching v3 metadata`);
    return null;
  }
}
