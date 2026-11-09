import { collections } from "@repo/db/indexer/schema";
import type { CollectionField, ProcessedImageField } from "@repo/lib/types/objekt";

export function getCollectionColumns() {
  return {
    id: collections.id,
    createdAt: collections.createdAt,
    slug: collections.slug,
    collectionId: collections.collectionId,
    season: collections.season,
    member: collections.member,
    members: collections.members,
    artist: collections.artist,
    collectionNo: collections.collectionNo,
    class: collections.class,
    thumbnailImage: collections.thumbnailImage,
    frontImage: collections.frontImage,
    backImage: collections.backImage,
    backgroundColor: collections.backgroundColor,
    textColor: collections.textColor,
    onOffline: collections.onOffline,
    bandImageUrl: collections.bandImageUrl,
    frontMedia: collections.frontMedia,
    hasAudio: collections.hasAudio,
    processedThumbnailImage: collections.processedThumbnailImage,
    processedFrontImage: collections.processedFrontImage,
    processedBackImage: collections.processedBackImage,
  } satisfies Record<CollectionField | ProcessedImageField, unknown>;
}

export function getPartialCollectionColumns() {
  return {
    slug: collections.slug,
    season: collections.season,
    collectionNo: collections.collectionNo,
    member: collections.member,
    artist: collections.artist,
    collectionId: collections.collectionId,
    class: collections.class,
  };
}
