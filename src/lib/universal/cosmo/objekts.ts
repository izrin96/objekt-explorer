export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: number;
  objekts: OwnedObjekt[];
};

export type ObjektBaseFields = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ("artms" | "tripleS")[];
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  comoAmount: number;
  transferablebyDefault: boolean;
  tokenId: string;
  tokenAddress: string;
  objektNo: number;
  transferable: boolean;
};

export interface OwnedObjekt extends ObjektBaseFields {
  usedForGrid: boolean;
  lenticularPairTokenId: string | null;
  mintedAt: string;
  receivedAt: string;
  status: string;
  nonTransferableReason?: string;
}
