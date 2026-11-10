import { serverEnv } from "@repo/api/env";
import { createFileRoute } from "@tanstack/react-router";

const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
let cached: { body: string; fetchedAt: number } | undefined;
// one upstream fetch at a time; concurrent requests at expiry share it
let refreshing: Promise<void> | undefined;

function refresh(scriptUrl: string) {
  refreshing ??= (async () => {
    try {
      const upstream = await fetch(scriptUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!upstream.ok) return;
      const body = (await upstream.text()).replaceAll("/api/send", "/e");
      cached = { body, fetchedAt: Date.now() };
    } catch {
      // kept quiet like /m/e: an Umami outage would otherwise log once per page view
    } finally {
      refreshing = undefined;
    }
  })();
  return refreshing;
}

export const Route = createFileRoute("/m/s")({
  server: {
    handlers: {
      GET: async () => {
        const scriptUrl = serverEnv.VITE_UMAMI_SCRIPT_URL;
        if (!scriptUrl) {
          return new Response(null, { status: 404 });
        }

        if (!cached) await refresh(scriptUrl);
        // an older copy is served at once and refreshed behind it, so an Umami outage costs no wait
        else if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) void refresh(scriptUrl);
        if (!cached) return new Response(null, { status: 502 });

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
