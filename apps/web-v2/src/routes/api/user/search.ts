import { createFileRoute } from "@tanstack/react-router";
import { like } from "drizzle-orm";
import { cacheUsers } from "@/lib/server/auth";
import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { userAddress } from "@/lib/server/db/schema";
import { getAccessToken } from "@/lib/server/token";
import type { CosmoSearchResult } from "@/lib/universal/cosmo/auth";

export const Route = createFileRoute("/api/user/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") ?? "";

        if (query.length < 1) return Response.json({ results: [] });

        try {
          const accessToken = await getAccessToken();

          const results = await search(accessToken.accessToken, query);

          // caching user address
          if (results.results.length > 0) {
            await cacheUsers(results.results);
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
      },
    },
  },
});
