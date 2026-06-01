import { emptyMetadata, fetchMetadataV1 } from "@repo/cosmo/server/metadata";

export async function fetchMetadata(tokenId: string) {
  try {
    const metadata = await fetchMetadataV1(tokenId);
    return metadata;
  } catch {
    console.error(`[fetchMetadata] Error fetching v3 metadata`);
    // fallback to empty metadata
    return emptyMetadata(tokenId);
  }
}
