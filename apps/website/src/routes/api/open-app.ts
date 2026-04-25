import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/open-app")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const artist = url.searchParams.get("artist") ?? "";
        const to = url.searchParams.get("to") ?? "";
        return Response.redirect(`cosmo://${artist}/${to}`);
      },
    },
  },
});
