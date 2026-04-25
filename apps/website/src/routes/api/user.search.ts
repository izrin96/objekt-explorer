import { search } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { createFileRoute } from "@tanstack/react-router";
import { desc, like } from "drizzle-orm";

import { cacheUsers } from "@/lib/server/auth.server";
import { getAccessToken } from "@/lib/server/token.server";

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

          // caching user address (fire-and-forget)
          if (results.results.length > 0) {
            void cacheUsers(
              results.results.map((u) => ({
                nickname: u.nickname,
                address: u.address,
                cosmoId: u.id,
              })),
            );
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
          .orderBy(userAddress.nickname, desc(userAddress.id))
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
      },
    },
  },
});
