import { like } from "drizzle-orm";
import { after, type NextRequest } from "next/server";

import type { CosmoSearchResult } from "@/lib/universal/cosmo/auth";

import { cacheUsers } from "@/lib/server/auth";
import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { userAddress } from "@/lib/server/db/schema";
import { getAccessToken } from "@/lib/server/token";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") ?? "";

  if (query.length < 1) return Response.json({ results: [] });

  try {
    const accessToken = await getAccessToken();

    const results = await search(accessToken.accessToken, query);

    // caching user address
    if (results.results.length > 0) {
      after(async () => {
        await cacheUsers(results.results);
      });
    }

    return Response.json(results);
  } catch (err) {
    console.error("Cosmo user search failed:", err);
  }

  // fallback to db
  const users = await db
    .select({
      nickname: userAddress.nickname,
      address: userAddress.address,
    })
    .from(userAddress)
    .where(like(userAddress.nickname, `${query}%`))
    .limit(100);

  return Response.json({
    hasNext: false,
    nextStartAfter: null,
    results: users.map((a) => ({
      nickname: a.nickname!,
      address: a.address,
      profileImageUrl: "",
      userProfiles: [],
    })),
  } satisfies CosmoSearchResult);
}
