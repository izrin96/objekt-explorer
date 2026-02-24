import { search } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { desc, like } from "drizzle-orm";
import { after, type NextRequest } from "next/server";

import { cacheUsers } from "@/lib/server/auth";
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
        await cacheUsers(
          results.results.map((u) => ({
            nickname: u.nickname,
            address: u.address,
            cosmoId: u.id,
          })),
        );
      });
    }

    return Response.json(results);
  } catch (err) {
    console.error("Cosmo user search failed:", err);
  }

  // fallback to db
  const users = await db
    .selectDistinctOn([userAddress.nickname], {
      id: userAddress.id,
      nickname: userAddress.nickname,
      address: userAddress.address,
    })
    .from(userAddress)
    .where(like(userAddress.nickname, `${query}%`))
    .orderBy(desc(userAddress.id))
    .limit(100);

  return Response.json({
    hasNext: false,
    nextStartAfter: null,
    results: users.map((a) => ({
      id: a.id,
      nickname: a.nickname!,
      address: a.address,
      profileImageUrl: "",
      userProfiles: [],
    })),
  });
}
