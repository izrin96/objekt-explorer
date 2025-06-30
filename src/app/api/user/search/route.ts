import { like, sql } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { userAddress } from "@/lib/server/db/schema";
import { getAccessToken } from "@/lib/server/token";
import type { CosmoSearchResult } from "@/lib/universal/cosmo/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") ?? "";

  if (query.length < 4) return Response.json({ results: [] });

  try {
    const accessToken = await getAccessToken();

    const results = await search(accessToken.accessToken, query);

    // caching user address
    if (results.results.length > 0) {
      after(async () => {
        const users = await db
          .select({
            nickname: userAddress.nickname,
            address: userAddress.address,
          })
          .from(userAddress)
          .where(like(userAddress.nickname, `${query}%`));

        const newAddress = results.results.map((r) => ({
          nickname: r.nickname,
          address: r.address,
        }));

        const newAddressFiltered = newAddress.filter(
          (a) => !users.some((b) => b.address === a.address && b.nickname === a.nickname),
        );

        if (newAddressFiltered.length > 0) {
          try {
            await db
              .insert(userAddress)
              .values(newAddressFiltered)
              .onConflictDoUpdate({
                target: userAddress.address,
                set: {
                  nickname: sql.raw(`excluded.${userAddress.nickname.name}`),
                },
              });
          } catch (err) {
            console.error("Bulk user caching failed:", err);
          }
        }
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
    .where(like(userAddress.nickname, `${query}%`));

  return Response.json({
    results: users.map((a) => ({
      nickname: a.nickname,
      address: a.address,
      profileImageUrl: "",
      profile: [],
    })),
  } satisfies CosmoSearchResult);
}
