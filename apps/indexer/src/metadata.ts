import { emptyMetadata, fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { FetchError } from "ofetch";

export async function fetchMetadata(tokenId: string) {
  try {
    const metadata = await fetchMetadataV3(tokenId);
    return normalizeV3(metadata, tokenId);
  } catch (error) {
    if (error instanceof FetchError) {
      console.log(`[fetchMetadata] Error fetching v3 metadata (status: ${error.status})`);
    }
    // fallback to empty metadata
    return emptyMetadata(tokenId);
  }
}
