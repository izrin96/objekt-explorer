import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/open-app")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const artist = (url.searchParams.get("artist") as string) ?? "";
        const to = (url.searchParams.get("to") as string) ?? "";
        return Response.redirect(`cosmo://${artist}/${to}`);
      },
    },
  },
});
