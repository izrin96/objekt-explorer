import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { router } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";

import { apiMessages } from "@/lib/api-messages";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("ORPC Internal Error:", error);
      if (error instanceof ORPCError && error.cause) {
        console.error("Underlying cause:", error.cause);
      }
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
