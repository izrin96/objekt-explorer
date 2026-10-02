import type { Collection, Objekt } from "@repo/db/indexer/schema";

/** The collection columns every objekt carries — what `getCollectionColumns` selects. */
export type CollectionField =
  | "id"
  | "createdAt"
  | "slug"
  | "collectionId"
  | "season"
  | "member"
  | "members"
  | "artist"
  | "collectionNo"
  | "class"
  | "thumbnailImage"
  | "frontImage"
  | "backImage"
  | "backgroundColor"
  | "textColor"
  | "onOffline"
  | "bandImageUrl"
  | "frontMedia"
  | "hasAudio";

/** Columns `overrideCollection` folds into the image fields. */
export type ProcessedImageField =
  | "processedThumbnailImage"
  | "processedFrontImage"
  | "processedBackImage";

/**
 * Indexed collection — base collection info without ownership.
 *
 * `id` is a unique key within one surface: the collection uuid, the token id
 * or the list entry id, depending on where the row came from. Never parse it;
 * act on `tokenId`, `entryId` or `slug`.
 */
export type IndexedObjekt = Pick<Collection, CollectionField> & {
  /** the Cosmo-hosted image, before the processed copy replaced `frontImage` */
  originalFrontImage: string;
  originalBackImage: string;
};

export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable"> & {
    tokenId: string;
  };

export type ValidObjekt = OwnedObjekt | IndexedObjekt;

/** set by the list builders */
export type ListEntryFields = {
  entryId: number;
  price: number | null;
  isQyop: boolean;
  note: string | null;
};

/** set by the marketplace from its listing summary */
export type MarketFields = {
  /** cheapest live sale listing, always USD */
  floorPrice: number | null;
  /** at least one live sale listing is QYOP */
  hasQyop: boolean;
  listingCount: number;
  /** unix seconds */
  listedAt: number;
};

export type HeldFields = {
  /** copies held, standing in for the tokens of an owner too large to list one by one (COSMO Spin) */
  copies: number;
};

/** the profile owner's marks, set on the client */
export type PinState = {
  isPin: boolean;
  isLocked: boolean;
  pinOrder: number | null;
};

/** derived on the client by `mapObjektWithTag` */
export type ObjektTags = {
  tags: string[];
  edition: 1 | 2 | 3 | null;
};

export type ListObjekt = ValidObjekt & ListEntryFields;
export type MarketObjekt = IndexedObjekt & MarketFields;
export type HeldObjekt = IndexedObjekt & HeldFields;

/** what the shared filter, sort and grid code reads: any surface's row, tagged */
export type GridObjekt = ValidObjekt &
  ObjektTags &
  Partial<ListEntryFields & MarketFields & HeldFields & PinState>;

export type OwnedGridObjekt = GridObjekt & OwnedObjekt;
