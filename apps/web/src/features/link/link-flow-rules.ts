import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";

export type Code = { code: string; expiresInMs: number };

export function hasProfile(found: CosmoPublicUser, artistId: ValidArtist) {
  return found.userProfiles.some((p) => p.artistId.toLowerCase() === artistId.toLowerCase());
}

export function codeInput(found: CosmoPublicUser, artistId: ValidArtist) {
  return {
    address: found.address,
    cosmoId: found.id,
    nickname: found.nickname,
    artistId,
  };
}
