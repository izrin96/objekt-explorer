import type { ValidArtist } from "./common";

export type CosmoProfile = {
  artistId: ValidArtist;
  artistName: string;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type CosmoPublicUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  userProfiles: CosmoProfile[];
};

export type CosmoSearchResult = {
  hasNext: boolean;
  nextStartAfter: string | null;
  results: CosmoPublicUser[];
};
