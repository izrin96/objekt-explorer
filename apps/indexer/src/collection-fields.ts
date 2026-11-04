import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";

/** The collection columns each copy's metadata sets again on every transfer. */
export function collectionFields(metadata: CosmoObjektMetadataV1) {
  const { objekt } = metadata;
  return {
    season: objekt.season,
    member: objekt.member,
    members: objekt.members ?? [objekt.member],
    artist: objekt.artists[0]!.toLowerCase(),
    collectionNo: objekt.collectionNo,
    class: objekt.class,
    comoAmount: objekt.comoAmount,
    onOffline: objekt.collectionNo.includes("Z") ? "online" : "offline",
    thumbnailImage: objekt.thumbnailImage,
    frontImage: objekt.frontImage,
  };
}

export type CollectionFields = ReturnType<typeof collectionFields>;

/**
 * Whether `next` would change `current`. An upsert writes a new row version even when every
 * value is the same, so the indexer saves a known collection only when this is true.
 */
export function collectionChanged(current: CollectionFields, next: CollectionFields) {
  return (Object.keys(next) as (keyof CollectionFields)[]).some((key) => {
    const before = current[key];
    const after = next[key];
    if (Array.isArray(before) && Array.isArray(after)) {
      return before.length !== after.length || before.some((value, i) => value !== after[i]);
    }
    return before !== after;
  });
}
