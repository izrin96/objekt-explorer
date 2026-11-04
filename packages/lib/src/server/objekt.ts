import type { Collection, Objekt } from "@repo/db/indexer/schema";

import type {
  CollectionField,
  IndexedObjekt,
  OwnedObjekt,
  ProcessedImageField,
} from "../types/objekt";

type CollectionInput = Pick<Collection, CollectionField | ProcessedImageField>;

/**
 * Get custom band image
 */
function getBandImageUrl(objekt: CollectionInput) {
  if (objekt.bandImageUrl) return objekt.bandImageUrl;

  if (objekt.artist === "idntt") {
    if (objekt.class === "Special") {
      return "https://media.objekt.top/band-image/86207a80d354439cada0ec6c45e076ee20250814061643330.png";
    }

    if (objekt.class === "Unit" && objekt.onOffline === "online") {
      return "https://media.objekt.top/band-image/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png";
    }

    if (objekt.onOffline === "offline" && objekt.backgroundColor === "#000000") {
      return "https://media.objekt.top/band-image/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png";
    }

    if (objekt.class === "Welcome" && objekt.collectionNo === "200Z") {
      return "https://media.objekt.top/band-image/7d0e2956b196439eb10dd65ee94ac28e20250423082449685.png";
    }
  }

  return null;
}

/**
 * Apply band image overrides to any objekt type; staff colours are already on the row. Fields are
 * listed rather than spread, so a full row (the activity feed's) carries no other column.
 */
export function overrideCollection(collection: CollectionInput): IndexedObjekt {
  return {
    id: collection.id,
    createdAt: new Date(collection.createdAt).toISOString(),
    slug: collection.slug,
    collectionId: collection.collectionId,
    season: collection.season,
    member: collection.member,
    members: collection.members,
    artist: collection.artist,
    collectionNo: collection.collectionNo,
    class: collection.class,
    thumbnailImage: collection.processedThumbnailImage ?? collection.thumbnailImage,
    frontImage: collection.processedFrontImage ?? collection.frontImage,
    backImage: collection.processedBackImage ?? collection.backImage,
    originalFrontImage: collection.frontImage,
    originalBackImage: collection.backImage,
    backgroundColor: collection.backgroundColor,
    textColor: collection.textColor,
    onOffline: collection.onOffline,
    bandImageUrl: getBandImageUrl(collection),
    frontMedia: collection.frontMedia,
    hasAudio: collection.hasAudio,
  };
}

/**
 * Map database Objekt + Collection to OwnedObjekt type
 */
export function mapOwnedObjekt(objekt: Objekt, collection: CollectionInput): OwnedObjekt {
  return {
    ...overrideCollection(collection),
    id: objekt.id,
    serial: objekt.serial,
    receivedAt: new Date(objekt.receivedAt).toISOString(),
    mintedAt: new Date(objekt.mintedAt).toISOString(),
    transferable: objekt.transferable,
    tokenId: objekt.id,
  };
}

export function mapTransfer<T extends { timestamp: string }>(transfer: T): T {
  return {
    ...transfer,
    timestamp: new Date(transfer.timestamp).toISOString(),
  };
}
