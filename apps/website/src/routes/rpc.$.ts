import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";

import { router } from "@/lib/server/api/routers";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("ORPC Internal Error:", error);
      if (error instanceof ORPCError && error.cause) {
        console.error("Underlying cause:", error.cause);
      }
    }),
  ],
  strictGetMethodPluginEnabled: false,
  plugins: [new BatchHandlerPlugin(), new SimpleCsrfProtectionHandlerPlugin()],
});

export const Route = createFileRoute("/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/rpc",
          context: {
            headers: request.headers,
          },
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
