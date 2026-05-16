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
