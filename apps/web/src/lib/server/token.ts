import { refresh } from "@repo/cosmo/server/auth";
import { type RefreshTokenResult } from "@repo/cosmo/types/auth";

import { db } from "./db";
import { accessToken } from "./db/schema";
import { validateExpiry } from "./jwt";

export async function getAccessToken() {
  const result = await db.query.accessToken.findFirst();
  if (!result)
    return {
      accessToken: "",
      refreshToken: "",
    };

  if (!validateExpiry(result.accessToken)) {
    if (validateExpiry(result.refreshToken)) {
      const newTokens = await refresh(result.refreshToken);
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
