import { refreshV3 } from "@repo/cosmo/server/auth";
import { db } from "@repo/db";
import { accessToken } from "@repo/db/schema";
import { readExpiry, validateExpiry } from "@repo/lib/server";

import { log } from "../lib/log";

// Refresh the access token when it expires within this many seconds. The
// cron interval should be set to roughly half of this value so the refresh
// runs at least once before the token actually expires.
const REFRESH_LEAD_TIME_SECONDS = 5 * 60;
const tokenLog = log("access-token");
const SAVE_ATTEMPTS = 4;

export async function refreshAccessToken() {
  const result = await db.query.accessToken.findFirst();
  if (!result) {
    tokenLog.error("no token in db — run an initial seed");
    return;
  }

  const exp = readExpiry(result.accessToken);
  const nowSeconds = Date.now() / 1000;

  if (exp !== null && exp - nowSeconds > REFRESH_LEAD_TIME_SECONDS) {
    // Still has plenty of time; nothing to do.
    return;
  }

  if (!validateExpiry(result.refreshToken)) {
    tokenLog.error("refresh token is expired or malformed; manual re-auth required");
    return;
  }

  const key = process.env.COSMO_KEY;
  if (!key) {
    tokenLog.error("COSMO_KEY env var is not set");
    return;
  }

  let newTokens: Awaited<ReturnType<typeof refreshV3>>;
  try {
    newTokens = await refreshV3(result.refreshToken, key);
  } catch (err) {
    tokenLog.warn("refresh failed; retrying at the next run:", err);
    return;
  }

  // Cosmo rotated the refresh token, so the old one is dead: the write must not be lost.
  for (let attempt = 1; ; attempt++) {
    try {
      await db.update(accessToken).set({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
      break;
    } catch (err) {
      if (attempt === SAVE_ATTEMPTS) {
        tokenLog.error(
          "refreshed but could not save the new tokens; manual re-auth required:",
          err,
        );
        return;
      }
      await Bun.sleep(attempt * 500);
    }
  }

  tokenLog.info("refreshed, new exp:", readExpiry(newTokens.accessToken));
}
