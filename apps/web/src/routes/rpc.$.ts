import { ORPCError, ValidationError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { router } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";

import { apiMessages } from "@/lib/api-messages";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error, { request }) => {
      const where = `${request.method} ${request.url.pathname}`;
      const ua = request.headers["user-agent"];

      if (error instanceof SyntaxError) {
        console.error("ORPC malformed input:", where, {
          data: request.url.searchParams.get("data")?.slice(0, 500),
          contentType: request.headers["content-type"],
          contentLength: request.headers["content-length"],
          ua,
        });
        return;
      }

      if (error instanceof ORPCError && error.cause instanceof ValidationError) {
        console.error("ORPC input validation:", where, {
          issues: error.cause.issues,
          input: error.cause.data,
          ua,
        });
        return;
      }

      console.error("ORPC error:", where, error, error instanceof ORPCError ? error.cause : "");
    }),
  ],
  plugins: [new BatchHandlerPlugin()],
});

export const Route = createFileRoute("/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/rpc",
          context: {
            headers: request.headers,
            messages: apiMessages,
          },
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
