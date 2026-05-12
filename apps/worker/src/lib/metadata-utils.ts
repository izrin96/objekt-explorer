import { fetchMetadataV1, fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { FetchError } from "ofetch";

export async function safeFetchMetadataV1(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    if (error instanceof FetchError) {
      console.log(`[fetchMetadata] Error fetching v3 metadata (status: ${error.status})`);
    }
    return null;
  }
}

export async function safeFetchMetadataV3(tokenId: string) {
  try {
    const metadata = await fetchMetadataV3(tokenId);
    return normalizeV3(metadata, tokenId);
  } catch (error) {
    if (error instanceof FetchError) {
      console.log(`[fetchMetadata] Error fetching v3 metadata (status: ${error.status})`);
    }
    return null;
  }
}
