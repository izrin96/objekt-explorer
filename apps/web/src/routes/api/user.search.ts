import { rateLimit } from "@repo/api/services/redis";
import { getAccessToken } from "@repo/api/services/token";
import { search } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { cacheUsers } from "@repo/lib/server/user";
import { createFileRoute } from "@tanstack/react-router";
import { desc, like } from "drizzle-orm";

const MAX_QUERY_LENGTH = 50;
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;

export const Route = createFileRoute("/api/user/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") ?? "";

        if (query.length < 1) return Response.json({ results: [] });
        if (query.length > MAX_QUERY_LENGTH) {
          return Response.json({ error: "Query too long" }, { status: 400 });
        }

        // best-effort per-IP rate limit to protect the upstream Cosmo API.
        // Traefik overwrites x-real-ip with the peer address; any other header
        // arrives as the client wrote it.
        const ip = request.headers.get("x-real-ip") ?? "unknown";
        const attempts = await rateLimit(`user-search:rl:${ip}`, RATE_WINDOW_SECONDS);
        if (attempts > RATE_LIMIT) {
          return Response.json({ error: "Too many requests" }, { status: 429 });
        }

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

          return Response.json({ ...results, results: validUsers });
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

        return Response.json({
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
        });
      },
    },
  },
});
