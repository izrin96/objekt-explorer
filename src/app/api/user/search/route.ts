import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";
import { userAddress } from "@/lib/server/db/schema";
import { getAccessToken } from "@/lib/server/token";
import { after, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  const searchParams = request.nextUrl.searchParams;
  const results = await search(
    accessToken.accessToken,
    searchParams.get("query") ?? ""
  );

  // caching user address
  if (results.results.length > 0) {
    after(async () => {
      const newAddress = results.results.map((r) => ({
        nickname: r.nickname,
        address: r.address,
      }));

      try {
        await db
          .insert(userAddress)
          .values(newAddress)
          .onConflictDoUpdate({
            target: userAddress.address,
            set: {
              nickname: sql.raw(`excluded.${userAddress.nickname.name}`),
            },
          });
      } catch (err) {
        console.error(err);
      }
    });
  }

  return Response.json(results);
}
