export type PublicCollection = {
  id: string;
  createdAt: string;
  slug: string;
  collectionId: string;
  season: string;
  member: string;
  artist: string;
  collectionNo: string;
  class: string;
  frontImage: string;
  backImage: string;
  backgroundColor: string;
  textColor: string;
  onOffline: "online" | "offline";
  bandImageUrl: string | null;
};

export type CollectionExtra = {
  tags: string[];
  edition: 1 | 2 | 3 | null;
};

export type CollectionItem = PublicCollection & CollectionExtra;

export type ObjektStatus = {
  mintedAt: string;
  receivedAt: string;
  serial: number;
  transferable: boolean;
};

export type PublicObjekt = PublicCollection & ObjektStatus;

export type ObjektExtra = {
  isPin: boolean;
  isLocked: boolean;
  pinOrder: number | null;
};

export type ObjektItem = CollectionItem & ObjektStatus & ObjektExtra;

export type ObjektOrder = {
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
  timestamp: string;
  nickname?: string | null;
};

export type ObjektResult = {
  hide?: boolean;
  tokenId?: string;
  owner?: string;
  transferable?: boolean;
  transfers: ObjektTransfer[];
};

export type ObjektsResult = {
  nextCursor?: {
    receivedAt: string | Date;
    id: string;
  };
  objekts: PublicObjekt[];
};
