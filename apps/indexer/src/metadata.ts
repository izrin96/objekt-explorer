import { emptyMetadata, fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";

export async function fetchMetadata(tokenId: string) {
  try {
    const metadata = await fetchMetadataV3(tokenId);
    return normalizeV3(metadata, tokenId);
  } catch {
    console.error(`[fetchMetadata] Error fetching metadata`);
    // fallback to empty metadata
    return emptyMetadata(tokenId);
  }
}
