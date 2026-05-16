import { refreshV3 } from "@repo/cosmo/server/auth";
import { type RefreshTokenResult } from "@repo/cosmo/types/auth";
import { db } from "@repo/db";
import { accessToken } from "@repo/db/schema";

import { serverEnv } from "../env/server";
import { validateExpiry } from "./jwt.server";

export async function getAccessToken() {
  const result = await db.query.accessToken.findFirst();
  if (!result)
    return {
      accessToken: "",
      refreshToken: "",
    };

  if (!validateExpiry(result.accessToken)) {
    if (validateExpiry(result.refreshToken)) {
      const newTokens = await refreshV3(result.refreshToken, serverEnv.COSMO_KEY);
      await updateAccessToken(newTokens);
      return newTokens;
    }
  }

  return result;
}

export async function updateAccessToken(newToken: RefreshTokenResult) {
  await db.update(accessToken).set({
    accessToken: newToken.accessToken,
    refreshToken: newToken.refreshToken,
  });
}
