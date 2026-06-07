import { refreshV3 } from "@repo/cosmo/server/auth";
import { db } from "@repo/db";
import { accessToken } from "@repo/db/schema";
import { readExpiry, validateExpiry } from "@repo/lib/server";

// Refresh the access token when it expires within this many seconds. The
// cron interval should be set to roughly half of this value so the refresh
// runs at least once before the token actually expires.
const REFRESH_LEAD_TIME_SECONDS = 5 * 60;

export async function refreshAccessToken() {
  const result = await db.query.accessToken.findFirst();
  if (!result) {
    console.warn("[access-token] no token in db — run an initial seed");
    return;
  }

  const exp = readExpiry(result.accessToken);
  const nowSeconds = Date.now() / 1000;

  if (exp !== null && exp - nowSeconds > REFRESH_LEAD_TIME_SECONDS) {
    // Still has plenty of time; nothing to do.
    return;
  }

  if (!validateExpiry(result.refreshToken)) {
    console.error("[access-token] refresh token is expired or malformed; manual re-auth required");
    return;
  }

  const key = process.env.COSMO_KEY;
  if (!key) {
    console.error("[access-token] COSMO_KEY env var is not set");
    return;
  }

  try {
    const newTokens = await refreshV3(result.refreshToken, key);
    await db.update(accessToken).set({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });

    console.log("[access-token] refreshed, new exp:", readExpiry(newTokens.accessToken));
  } catch (err) {
    console.error("[access-token] refresh failed:", err);
  }
}
