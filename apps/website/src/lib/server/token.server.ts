import type { RefreshTokenResult } from "@repo/cosmo/types/auth";
import { db } from "@repo/db";

/**
 * Read the current Cosmo access token from the database.
 *
 * Token refresh is owned by the worker (see apps/worker/src/job/refresh-access-token.ts)
 * which proactively rotates the token before it expires. The website
 * only reads; if the token is somehow expired when read, the upstream
 * Cosmo call will fail and the caller is expected to surface the error.
 */
export async function getAccessToken(): Promise<RefreshTokenResult> {
  const result = await db.query.accessToken.findFirst();
  if (!result) {
    return { accessToken: "", refreshToken: "" };
  }
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}
