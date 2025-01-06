import { ValidArtist } from "./common";

export type CosmoProfile = {
  artistName: ValidArtist;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type CosmoPublicUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  profile: CosmoProfile[];
};

export type CosmoSearchResult = {
  results: CosmoPublicUser[];
};
