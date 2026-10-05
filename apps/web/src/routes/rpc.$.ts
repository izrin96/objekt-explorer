import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { router } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";

import { apiMessages } from "@/lib/api-messages";
import { logORPCError } from "@/lib/server/orpc-error-log";

const handler = new RPCHandler(router, {
  interceptors: [onError((error, { request }) => logORPCError(error, request))],
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
