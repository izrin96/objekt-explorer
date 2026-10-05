import { search } from "@repo/cosmo/server/user";
import type { CosmoSearchResult } from "@repo/cosmo/types/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { cacheUsers } from "@repo/lib/server/user";
import { desc, like } from "drizzle-orm";

import { getAccessToken } from "./token";

const emptyResult: CosmoSearchResult = { hasNext: false, nextStartAfter: null, results: [] };

/** Cosmo's user search, falling back to the nicknames cached here when Cosmo fails. */
export async function searchUsers(query: string): Promise<CosmoSearchResult> {
  if (query.length < 1) return emptyResult;

  try {
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
  } catch (err) {
    console.error("Cosmo user search failed:", err);
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
