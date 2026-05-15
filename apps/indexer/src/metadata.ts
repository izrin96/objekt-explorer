import { emptyMetadata, fetchMetadataV1 } from "@repo/cosmo/server/metadata";
import { FetchError } from "ofetch";

export async function fetchMetadata(tokenId: string) {
  try {
    const metadata = await fetchMetadataV1(tokenId);
    return metadata;
  } catch (error) {
    if (error instanceof FetchError) {
      console.log(`[fetchMetadata] Error fetching v3 metadata (status: ${error.status})`);
    }
    // fallback to empty metadata
    return emptyMetadata(tokenId);
  }
}
