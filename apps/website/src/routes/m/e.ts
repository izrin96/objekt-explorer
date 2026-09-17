import { createFileRoute } from "@tanstack/react-router";

import { serverEnv } from "@/lib/env/server";

const FORWARDED_HEADERS = ["content-type", "user-agent", "accept-language"];

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
        const ip = request.headers.get("x-client-ip") ?? request.headers.get("x-forwarded-for");
        if (ip) headers.set("x-forwarded-for", ip);

        const upstream = await fetch(new URL("/api/send", scriptUrl), {
          method: "POST",
          headers,
          body: await request.text(),
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
