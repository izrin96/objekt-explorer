import {
  CosmoArtistBFF,
  CosmoArtistWithMembersBFF,
} from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

export async function fetchArtistsBff() {
  return await cosmo<CosmoArtistBFF[]>(`/bff/v3/artists`, {
    next: {
      revalidate: 60 * 60 * 12,
    },
  });
}

export async function fetchArtistBff(artistName: ValidArtist) {
  return await cosmo<CosmoArtistWithMembersBFF>(
    `/bff/v3/artists/${artistName}`,
    {
      next: {
        revalidate: 60 * 60 * 12,
      },
    }
  );
}
