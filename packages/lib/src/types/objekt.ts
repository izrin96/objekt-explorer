import type { Collection, Objekt } from "@repo/db/indexer/schema";

// Extra fields not in DB schema
type CollectionExtra = {
  tags?: string[];
  edition?: 1 | 2 | 3 | null;
  order?: number;
  price?: number | null;
  isQyop?: boolean;
  note?: string | null;
};

type OwnedExtra = {
  isPin?: boolean;
  isLocked?: boolean;
  pinOrder?: number | null;
  tokenId?: string;
};

// Indexed collection - base collection info without ownership
export type IndexedObjekt = Omit<
  Collection,
  "contract" | "comoAmount" | "accentColor" | "thumbnailImage"
> &
  CollectionExtra;

// Owned objekt - collection + ownership info
export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable"> &
  OwnedExtra;

// Union type for functions that accept either indexed or owned objekts
export type ValidObjekt = OwnedObjekt | IndexedObjekt;

// Pin info
export type PinObjekt = {
  tokenId: string;
  order: number | null;
};

// Lock info
export type LockObjekt = {
  tokenId: string;
};

// Collection metadata
export type CollectionMetadata = {
  transferable: number;
  total: number;
  spin: number;
};

// Transfer history
export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: string;
  nickname?: string | null;
};

export type ObjektTransferResult = {
  hide?: boolean;
  tokenId?: string;
  owner?: string;
  transferable?: boolean;
  transfers: ObjektTransfer[];
};

// API response types
export type OwnedObjektsCursor = {
  receivedAt?: string;
  serial?: number;
  collectionNo?: string;
  id: string;
};

export type OwnedObjektsResult = {
  nextCursor?: OwnedObjektsCursor;
  objekts: OwnedObjekt[];
  total?: number;
};

export type CollectionResult = {
  collections: IndexedObjekt[];
};
