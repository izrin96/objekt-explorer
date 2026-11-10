import { serverEnv } from "@repo/api/env";
import { ipRateLimited } from "@repo/api/services/redis";
import { createFileRoute } from "@tanstack/react-router";

import { READ_DEADLINE_MS, readCapped } from "@/lib/server/error-tunnel";

// a page view or event is a few hundred bytes; the tracker sends no custom data here
const MAX_EVENT_BYTES = 16 * 1024;
// one person sends one event per navigation; a shared address (mobile carrier NAT) sends more
const PER_IP_PER_MINUTE = 120;
const FORWARDED_HEADERS = ["content-type", "user-agent", "accept-language"];
// Traefik overwrites x-real-ip with the peer address; any other header arrives
// as the client wrote it
function getClientIp(headers: Headers) {
  return headers.get("x-real-ip")?.trim() || undefined;
}

// umami prioritizes payload ip over proxy headers, which its reverse proxy overwrites
function withClientIp(body: string, ip: string) {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      const { payload } = parsed as { payload: unknown };
      if (payload && typeof payload === "object") {
        (payload as { ip?: string }).ip = ip;
        return JSON.stringify(parsed);
      }
    }
  } catch {
    // not JSON
  }
  return body;
}

export const Route = createFileRoute("/m/e")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const scriptUrl = serverEnv.VITE_UMAMI_SCRIPT_URL;
        if (!scriptUrl) {
          return new Response(null, { status: 404 });
        }

        if (await ipRateLimited("umami", request.headers, PER_IP_PER_MINUTE, 60)) {
          return new Response(null, { status: 429, headers: { "retry-after": "60" } });
        }
        const declared = Number(request.headers.get("content-length"));
        if (declared > MAX_EVENT_BYTES) return new Response(null, { status: 413 });
        const read = await readCapped(request.body, MAX_EVENT_BYTES, READ_DEADLINE_MS);
        if (read === "too_large") return new Response(null, { status: 413 });
        if (read === "timeout") return new Response(null, { status: 408 });

        const headers = new Headers();
        for (const name of FORWARDED_HEADERS) {
          const value = request.headers.get(name);
          if (value) headers.set(name, value);
        }
        request.headers.forEach((value, name) => {
          if (name.startsWith("x-umami-")) headers.set(name, value);
        });

        const ip = getClientIp(request.headers);
        let body = new TextDecoder().decode(read);
        if (ip) {
          headers.set("x-forwarded-for", ip);
          headers.set("x-client-ip", ip);
          body = withClientIp(body, ip);
        }

        try {
          const upstream = await fetch(new URL("/api/send", scriptUrl), {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(5000),
          });

          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "content-type": upstream.headers.get("content-type") ?? "application/json",
            },
          });
        } catch {
          // not reported: every analytics event during an umami outage would land in Sentry
          return new Response(null, { status: 502 });
        }
      },
    },
  },
});
