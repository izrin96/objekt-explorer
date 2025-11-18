import type { Collection, Objekt } from "@objekt-explorer/db/indexer/schema";

export type ParsedDate = string | Date;

type CollectionExtra = {
  tags?: string[];
};

export type IndexedObjekt = Omit<
  Collection,
  "contract" | "comoAmount" | "accentColor" | "thumbnailImage"
> &
  CollectionExtra;

export type OwnedObjekt = IndexedObjekt &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "transferable"> &
  OwnedExtra;

type OwnedExtra = {
  isPin?: boolean;
  isLocked?: boolean;
  pinOrder?: number | null;
};

export type ValidObjekt = OwnedObjekt | IndexedObjekt;

export type PinObjekt = {
  tokenId: string;
  order: number | null;
};

export type CollectionMetadata = {
  transferable: number;
  total: number;
  spin: number;
  createdAt: string;
};

export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: ParsedDate;
  nickname?: string | null;
};

export type ObjektTransferResult = {
  hide?: boolean;
  tokenId?: string;
  owner?: string;
  transferable?: boolean;
  transfers: ObjektTransfer[];
};

export type OwnedObjektsResult = {
  nextCursor?: {
    receivedAt: string | Date;
    id: string;
  };
  objekts: OwnedObjekt[];
};

export type CollectionResult = {
  collections: IndexedObjekt[];
};
