import { MAX_USER_SEARCH_LENGTH } from "@repo/api/schemas/user";
import { searchUsers } from "@repo/api/services/user-search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") ?? "";

        if (query.length > MAX_USER_SEARCH_LENGTH) {
          return Response.json({ error: "Query too long" }, { status: 400 });
        }

        return Response.json(await searchUsers(query, request.headers));
      },
    },
  },
});
