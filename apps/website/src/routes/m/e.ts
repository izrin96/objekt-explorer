import { serverEnv } from "@repo/api/env";
import { createFileRoute } from "@tanstack/react-router";

const FORWARDED_HEADERS = ["content-type", "user-agent", "accept-language"];
const IP_HEADERS = ["x-client-ip", "cf-connecting-ip", "x-real-ip", "x-forwarded-for"];

function getClientIp(headers: Headers) {
  for (const name of IP_HEADERS) {
    const value = headers.get(name);
    if (value) return value.split(",")[0]?.trim();
  }
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

        const headers = new Headers();
        for (const name of FORWARDED_HEADERS) {
          const value = request.headers.get(name);
          if (value) headers.set(name, value);
        }
        request.headers.forEach((value, name) => {
          if (name.startsWith("x-umami-")) headers.set(name, value);
        });

        const ip = getClientIp(request.headers);
        let body = await request.text();
        if (ip) {
          headers.set("x-forwarded-for", ip);
          headers.set("x-client-ip", ip);
          body = withClientIp(body, ip);
        }

        const upstream = await fetch(new URL("/api/send", scriptUrl), {
          method: "POST",
          headers,
          body,
        });

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "application/json",
          },
        });
      },
    },
  },
});
