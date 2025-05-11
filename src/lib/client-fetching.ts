import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import { artists } from "./server/cosmo/artists";
import { cache } from "react";

export const getArtistsWithMembers = cache(async () => {
  return artists satisfies CosmoArtistWithMembersBFF[];
});

export const getUserByIdentifier = cache(async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
});
