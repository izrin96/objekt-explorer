import { FetchError, ofetch } from "ofetch";

import type { CosmoObjektMetadataV1, CosmoObjektMetadataV3 } from "../types/metadata";

/**
 * Fetch objekt metadata from the v1 API.
 */
export async function fetchMetadataV1(tokenId: string) {
  return await ofetch<CosmoObjektMetadataV1>(`https://api.cosmo.fans/objekt/v1/token/${tokenId}`, {
    retry: 1,
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
 */
export async function fetchMetadata(tokenId: string) {
  try {
    return await fetchMetadataV1(tokenId);
  } catch (error) {
    const statusInfo = error instanceof FetchError ? ` (status: ${error.status})` : "";
    console.log(`[fetchMetadata] Error fetching v1 metadata${statusInfo}: ${error}`);

    try {
      // fallback to v3
      const metadata = await fetchMetadataV3(tokenId);
      return normalizeV3(metadata, tokenId);
    } catch (error) {
      if (error instanceof FetchError) {
        console.log(`[fetchMetadata] Error fetching v3 metadata: ${error}`);
      }
      if (error instanceof Error) {
        console.log(`[fetchMetadata] Error: ${error}`);
      }
      // fallback to empty metadata
      return emptyMetadata(tokenId);
    }
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
      tokenAddress: "0x0000000000000000000000000000000000000000",
      transferable: true,
    },
  };
}

/**
 * Get a trait from the metadata attributes array.
 */
export function getTrait(metadata: CosmoObjektMetadataV3, tokenId: string, trait: string) {
  const isUnit = metadata.attributes.some((a) => a.trait_type === "Class" && a.value === "Unit");

  let attr;

  if (trait === "Member" && isUnit) {
    // special case: find combined member (e.g. "id4 X id8")
    attr = metadata.attributes.find((a) => a.trait_type === "Member" && a.value.includes(" X "));
  } else {
    attr = metadata.attributes.find((a) => a.trait_type === trait);
  }

  if (!attr) {
    throw new Error(`[normalizeV3] Trait ${trait} not found for token ${tokenId}`);
  }

  return attr.value;
}

/**
 * Attempt to convert v3 metadata to v1 metadata.
 */
export function normalizeV3(
  metadata: CosmoObjektMetadataV3,
  tokenId: string,
): CosmoObjektMetadataV1 {
  const artist = getTrait(metadata, tokenId, "Artist");
  const className = getTrait(metadata, tokenId, "Class");
  const member = getTrait(metadata, tokenId, "Member");
  const season = getTrait(metadata, tokenId, "Season");
  const collection = getTrait(metadata, tokenId, "Collection");

  const thumbnail = metadata.image.replace(/\/(4x|3x|2x|original)/, "/thumbnail");
  const comoAmount = className === "Motion" ? 3 : ["Double", "Premier"].includes(className) ? 2 : 1;

  return {
    name: metadata.name,
    description: metadata.description,
    image: metadata.image,
    background_color: metadata.background_color,
    objekt: {
      collectionId: `${season} ${member} ${collection}`,
      season: season,
      member: member,
      collectionNo: collection,
      class: className,
      artists: [artist],
      thumbnailImage: thumbnail,
      frontImage: metadata.image,
      backgroundColor: metadata.background_color,
      comoAmount: comoAmount,
      tokenId: tokenId,
      // not possible to get from v3
      backImage: "",
      accentColor: "",
      textColor: "#000000",
      objektNo: 0,
      tokenAddress: "0x0000000000000000000000000000000000000000",
      transferable: true,
    },
  };
}

/**
 * Partial data for db update
 */
export function enrichUpdateMetadata(metadata: CosmoObjektMetadataV1) {
  return {
    season: metadata.objekt.season,
    member: metadata.objekt.member,
    artist: metadata.objekt.artists[0]!.toLowerCase(),
    collectionNo: metadata.objekt.collectionNo,
    class: metadata.objekt.class,
    comoAmount: metadata.objekt.comoAmount,
    onOffline: metadata.objekt.collectionNo.includes("Z")
      ? ("online" as const)
      : ("offline" as const),
    thumbnailImage: metadata.objekt.thumbnailImage,
    frontImage: metadata.objekt.frontImage,
    backImage: metadata.objekt.backImage,
    backgroundColor: metadata.objekt.backgroundColor,
    textColor: metadata.objekt.textColor,
    accentColor: metadata.objekt.accentColor,
  };
}
