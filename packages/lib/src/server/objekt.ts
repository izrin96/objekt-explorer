import type { Collection, Objekt } from "@repo/db/indexer/schema";

import type {
  CollectionField,
  IndexedObjekt,
  OwnedObjekt,
  ProcessedImageField,
} from "../types/objekt";

type CollectionOverride = Partial<{
  backgroundColor: string;
  textColor: string;
}>;

type CollectionInput = Pick<Collection, CollectionField | ProcessedImageField>;

type TransferRow = {
  id: string;
  from: string;
  to: string;
  timestamp: string | null;
  hash?: string;
  objektId?: string | null;
  collectionId?: string | null;
};

/**
 * Override color for some collection
 */
const collectionOverrides = {
  // Divine collections
  "divine01-seoyeon-117z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-118z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-119z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-120z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-317z": { backgroundColor: "#df2e37" },

  // Binary collections
  "binary01-choerry-201z": { backgroundColor: "#FFFFFF" },
  "binary01-choerry-202z": { backgroundColor: "#FFFFFF" },

  // Atom collections
  "atom01-yubin-302z": { backgroundColor: "#D300BB" },
  "atom01-nakyoung-302z": { backgroundColor: "#D300BB" },
  "atom01-yooyeon-302z": { backgroundColor: "#D300BB" },
  "atom01-hyerin-302z": { backgroundColor: "#D300BB" },
  "atom01-heejin-322z": { textColor: "#FFFFFF" },
  "atom01-heejin-323z": { textColor: "#FFFFFF" },
  "atom01-heejin-324z": { textColor: "#FFFFFF" },
  "atom01-heejin-325z": { textColor: "#FFFFFF" },

  // Ever collections
  "ever01-seoyeon-338z": { textColor: "#07328D" },
} as const satisfies Record<string, CollectionOverride>;

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
 * Apply color and band image overrides to any objekt type. Fields are listed
 * rather than spread, so a full row (the activity feed's) carries no other column.
 */
export function overrideCollection(collection: CollectionInput): IndexedObjekt {
  const overrides: CollectionOverride =
    collectionOverrides[collection.slug as keyof typeof collectionOverrides] ?? {};

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
    backgroundColor: overrides.backgroundColor ?? collection.backgroundColor,
    textColor: overrides.textColor ?? collection.textColor,
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

export function mapTransfer(transfer: TransferRow): TransferRow {
  return {
    ...transfer,
    timestamp: transfer.timestamp ? new Date(transfer.timestamp).toISOString() : null,
  };
}
