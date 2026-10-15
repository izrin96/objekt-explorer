import { fetchMetadataV1, fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";

import { log } from "./log";

const metadataLog = log("metadata");

export async function safeFetchMetadataV1(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    metadataLog.debug(`Could not fetch v1 metadata for ${tokenId}:`, error);
    return null;
  }
}

export async function safeFetchMetadataV3(tokenId: string) {
  try {
    const metadata = await fetchMetadataV3(tokenId);
    return normalizeV3(metadata, tokenId);
  } catch (error) {
    metadataLog.debug(`Could not fetch v3 metadata for ${tokenId}:`, error);
    return null;
  }
}
