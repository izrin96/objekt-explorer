import { serverEnv } from "@repo/api/env";
import { ipRateLimited } from "@repo/api/services/redis";
import { createFileRoute } from "@tanstack/react-router";

import {
  MAX_ENVELOPE_BYTES,
  READ_DEADLINE_MS,
  envelopeTarget,
  keepEventItems,
  readCapped,
} from "@/lib/server/error-tunnel";

// a page that throws in a loop sends one event per error; each one spends the
// Sentry plan's event quota, so a client gets this many a minute
const PER_IP_PER_MINUTE = 60;

// the SDK backs off on these, so they come back from Sentry unchanged
const RATE_LIMIT_HEADERS = ["retry-after", "x-sentry-rate-limits"];

// The browser SDK's `tunnel`: ad blockers drop requests to Sentry's own host, and this way only
// the body goes on, never the browser's cookies or address.
export const Route = createFileRoute("/api/errors")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const dsn = serverEnv.SENTRY_DSN;
        if (!dsn) return new Response(null, { status: 404 });

        if (await ipRateLimited("errors", request.headers, PER_IP_PER_MINUTE, 60)) {
          return new Response(null, { status: 429, headers: { "retry-after": "60" } });
        }

        const declared = Number(request.headers.get("content-length"));
        if (declared > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });
        const body = await readCapped(request.body, MAX_ENVELOPE_BYTES, READ_DEADLINE_MS);
        if (body === "too_large") return new Response(null, { status: 413 });
        if (body === "timeout") return new Response(null, { status: 408 });

        const target = envelopeTarget(body, dsn);
        if (!target) return new Response(null, { status: 400 });
        const events = keepEventItems(body);
        // nothing to forward is no failure the SDK should retry
        if (!events) return new Response(null, { status: 200 });

        try {
          const upstream = await fetch(target, {
            method: "POST",
            headers: { "content-type": "application/x-sentry-envelope" },
            body: events,
            signal: AbortSignal.timeout(5000),
          });
          const headers = new Headers();
          for (const name of RATE_LIMIT_HEADERS) {
            const value = upstream.headers.get(name);
            if (value) headers.set(name, value);
          }
          await upstream.body?.cancel();
          return new Response(null, { status: upstream.status, headers });
        } catch {
          // not reported: a report about the reporter being down would come back here
          return new Response(null, { status: 502 });
        }
      },
    },
  },
});
