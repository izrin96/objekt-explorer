import { fetchUserByIdentifier } from "./server/auth";
import { cache } from "react";

export const getUserByIdentifier = cache(async (identifier: string) => {
  // const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier);
});
