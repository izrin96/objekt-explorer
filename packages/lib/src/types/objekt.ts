// Extra fields not in DB schema
type CollectionExtra = {
  tags?: string[];
  edition?: 1 | 2 | 3 | null;
  order?: number;
  price?: number | null;
  isQyop?: boolean;
  note?: string | null;
};

// Indexed collection — base collection info without ownership
export type IndexedObjekt = {
  id: string;
  createdAt: string;
  slug: string;
  collectionId: string;
  season: string;
  member: string;
  artist: string;
  collectionNo: string;
  class: string;
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  backgroundColor: string;
  textColor: string;
  onOffline: "online" | "offline";
  bandImageUrl: string | null;
  frontMedia: string | null;
  hasAudio: boolean;
} & CollectionExtra;

// Owned objekt — collection + ownership info
export type OwnedObjekt = IndexedObjekt & {
  mintedAt: string;
  receivedAt: string;
  serial: number;
  transferable: boolean;
  tokenId: string;
  // todo: separate this
  isPin?: boolean;
  isLocked?: boolean;
  pinOrder?: number | null;
};

// Union type for functions that accept either indexed or owned objekts
export type ValidObjekt = OwnedObjekt | IndexedObjekt;
