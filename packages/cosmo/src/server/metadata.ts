import { ofetch } from "ofetch";

import type {
  CosmoObjektMetadataV1,
  CosmoObjektMetadataV3,
  MetadataVersion,
} from "../types/metadata";

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
      members: [],
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

function isUnitMetadata(metadata: CosmoObjektMetadataV3) {
  return metadata.attributes.some((a) => a.trait_type === "Class" && a.value === "Unit");
}

/**
 * Unit collections carry a combined "Member" trait (e.g. "id4 X id8") alongside
 * one trait per individual member.
 */
function isCombinedMember(value: string) {
  return value.toLowerCase().includes(" x ");
}

/**
 * Get a trait from the metadata attributes array.
 */
export function getTrait(metadata: CosmoObjektMetadataV3, tokenId: string, trait: string) {
  let attr = metadata.attributes.findLast((a) => a.trait_type === trait);

  if (trait === "Member" && isUnitMetadata(metadata)) {
    // special case: find combined member (e.g. "id4 X id8")
    const newAttr = metadata.attributes.findLast(
      (a) => a.trait_type === "Member" && isCombinedMember(a.value),
    );
    if (newAttr) attr = newAttr;
  }

  if (!attr) {
    throw new Error(`[normalizeV3] Trait ${trait} not found for token ${tokenId}`);
  }

  return attr.value;
}

/**
 * Get every member name from the metadata attributes array.
 * Unit collections carry one "Member" trait per individual member plus a
 * combined one (e.g. "id4 X id8"); the combined name is kept so that filtering
 * by it matches too.
 *
 * The canonical member — whichever trait `getTrait` resolves to — is placed
 * first, so `members[0]` always matches the collection's `member`. Cosmo lists
 * it last, after the individual names.
 */
export function getMembers(metadata: CosmoObjektMetadataV3): string[] {
  const members = metadata.attributes.filter((a) => a.trait_type === "Member").map((a) => a.value);

  const canonical = isUnitMetadata(metadata)
    ? members.findLastIndex(isCombinedMember)
    : members.length - 1;

  if (canonical < 0) return members;

  return [members[canonical]!, ...members.filter((_, i) => i !== canonical)];
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
  const members = getMembers(metadata);
  const season = getTrait(metadata, tokenId, "Season");
  const collection = getTrait(metadata, tokenId, "Collection");

  const thumbnail = metadata.image.replace(/\/(4x|3x|2x|original)/, "/thumbnail");
  const comoAmount = className === "Motion" ? 3 : ["Double", "Premier"].includes(className) ? 2 : 1;
  const textColor = getTextColor(className, collection);

  return {
    name: metadata.name,
    description: metadata.description,
    image: metadata.image,
    background_color: metadata.background_color,
    objekt: {
      collectionId: metadata.name.replace(/ #\d+$/, ""),
      season: season,
      member: member,
      members: members,
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
      textColor: textColor,
      objektNo: 0,
      tokenAddress: "0x0000000000000000000000000000000000000000",
      transferable: true,
    },
  };
}

/**
 * Get objekt text color
 */
function getTextColor(className: string, collection: string) {
  if (["First", "Motion", "Special", "Basic", "Welcome"].includes(className)) {
    return "#000000";
  }
  if (className === "Unit" && collection.includes("Z")) {
    return "#000000";
  }
  return "#ffffff";
}

/**
 * Partial data for db update
 */
export function enrichUpdateMetadata(
  metadata: CosmoObjektMetadataV1,
  { version }: { version: MetadataVersion },
) {
  return {
    season: metadata.objekt.season,
    member: metadata.objekt.member,
    members: metadata.objekt.members ?? [metadata.objekt.member],
    artist: metadata.objekt.artists[0]!.toLowerCase(),
    collectionNo: metadata.objekt.collectionNo,
    class: metadata.objekt.class,
    comoAmount: metadata.objekt.comoAmount,
    onOffline: metadata.objekt.collectionNo.includes("Z")
      ? ("online" as const)
      : ("offline" as const),
    thumbnailImage: metadata.objekt.thumbnailImage,
    frontImage: metadata.objekt.frontImage,
    backgroundColor: metadata.objekt.backgroundColor,
    ...(version === 1
      ? {
          // not possible to get from v3
          backImage: metadata.objekt.backImage,
          textColor: metadata.objekt.textColor,
          accentColor: metadata.objekt.accentColor,
        }
      : {}),
  };
}
