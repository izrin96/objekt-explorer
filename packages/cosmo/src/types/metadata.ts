export type CosmoObjektMetadataV1 = {
  name: string;
  description: string;
  image: string;
  background_color: string;
  objekt: {
    collectionId: string;
    season: string;
    member: string;
    collectionNo: string;
    class: string;
    artists: string[];
    thumbnailImage: string;
    frontImage: string;
    backImage: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    comoAmount: number;
    tokenId: string;
    objektNo: number;
    tokenAddress: string;
    transferable: boolean;
  };
};

export type CosmoObjektMetadataV3 = {
  name: string;
  description: string;
  image: string;
  background_color: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
};
