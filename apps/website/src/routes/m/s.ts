import { serverEnv } from "@repo/api/env";
import { createFileRoute } from "@tanstack/react-router";

const CACHE_TTL_MS = 60 * 60 * 1000;
let cached: { body: string; fetchedAt: number } | undefined;

export const Route = createFileRoute("/m/s")({
  server: {
    handlers: {
      GET: async () => {
        const scriptUrl = serverEnv.VITE_UMAMI_SCRIPT_URL;
        if (!scriptUrl) {
          return new Response(null, { status: 404 });
        }

        if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
          const upstream = await fetch(scriptUrl);
          if (!upstream.ok) {
            return new Response(null, { status: 502 });
          }
          const body = (await upstream.text()).replaceAll("/api/send", "/e");
          cached = { body, fetchedAt: Date.now() };
        }

        return new Response(cached.body, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
