import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";

import { router } from "@/lib/server/api/routers";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof ORPCError) {
    return {
      code: err.code,
      status: err.status,
      message: err.message,
      defined: err.defined,
      data: err.data,
      cause: err.cause ? serializeError(err.cause) : undefined,
      stack: err.stack,
    };
  }
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: err };
}

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      const serialized = serializeError(error);
      console.error("[ORPC Error]", JSON.stringify(serialized, null, 2));
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
          },
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
