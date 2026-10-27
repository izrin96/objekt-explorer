import { search } from "@repo/cosmo/server/user";
import type { CosmoSearchResult } from "@repo/cosmo/types/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { cacheUsers } from "@repo/lib/server/user";
import { desc, like } from "drizzle-orm";

import { getCache, globalRateLimited, ipRateLimited } from "./redis";
import { getAccessToken } from "./token";

const emptyResult: CosmoSearchResult = { hasNext: false, nextStartAfter: null, results: [] };

const RESULT_TTL_SECONDS = 60;
// every search spends the one shared Cosmo token, so all callers together get this many a minute
const COSMO_SEARCHES_PER_MINUTE = 300;

/** Per IP: a minute's budget, and a burst cap so it can't be spent in one go. */
export async function isUserSearchLimited(headers: Headers): Promise<boolean> {
  const [minute, burst] = await Promise.all([
    ipRateLimited("user-search", headers, 20, 60),
    ipRateLimited("user-search-burst", headers, 5, 5),
  ]);
  return minute || burst;
}

// thrown, not returned, so getCache keeps nothing for the query
const OVER_GLOBAL_LIMIT = new Error("Cosmo user search over its global limit");

async function searchCosmo(query: string): Promise<CosmoSearchResult> {
  if (await globalRateLimited("user-search", COSMO_SEARCHES_PER_MINUTE, 60)) {
    throw OVER_GLOBAL_LIMIT;
  }

  const accessToken = await getAccessToken();

  const results = await search(accessToken.accessToken, query);

  const validUsers = results.results.filter((u) => !!u.nickname);

  if (validUsers.length > 0) {
    void cacheUsers(
      validUsers.map((u) => ({
        nickname: u.nickname,
        address: u.address,
        cosmoId: u.id,
      })),
      { waitForLock: false },
    );
  }

  return { ...results, results: validUsers };
}

/** Cosmo's user search, falling back to the nicknames cached here when Cosmo fails or is over its limit. */
export async function searchUsers(query: string): Promise<CosmoSearchResult> {
  if (query.length < 1) return emptyResult;

  try {
    // its own prefix: under `user-search:` a query like "rl:global" would land on a rate-limit key
    return await getCache(`user-search-result:${query.toLowerCase()}`, RESULT_TTL_SECONDS, () =>
      searchCosmo(query),
    );
  } catch (err) {
    if (err !== OVER_GLOBAL_LIMIT) console.error("Cosmo user search failed:", err);
  }

  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");

  const users = await db
    .selectDistinctOn([userAddress.nickname], {
      cosmoId: userAddress.cosmoId,
      nickname: userAddress.nickname,
      address: userAddress.address,
    })
    .from(userAddress)
    .where(like(userAddress.nickname, `${escapedQuery}%`))
    .orderBy(userAddress.nickname, desc(userAddress.id))
    .limit(100);

  return {
    hasNext: false,
    nextStartAfter: null,
    // `id` is the Cosmo ID, which a user cached from a profile visit
    // never had: 0 there, so the link flow can leave them out
    results: users.map((a) => ({
      id: a.cosmoId ?? 0,
      nickname: a.nickname!,
      address: a.address,
      profileImageUrl: "",
      userProfiles: [],
    })),
  };
}
