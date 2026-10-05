import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { openApiRouter } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";

import { apiMessages } from "@/lib/api-messages";
import { logORPCError } from "@/lib/server/orpc-error-log";

const handler = new OpenAPIHandler(openApiRouter, {
  interceptors: [onError((error, { request }) => logORPCError(error, request))],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsTitle: "Objekt Explorer API",
      specGenerateOptions: {
        info: { title: "Objekt Explorer API", version: "1.0.0" },
        servers: [{ url: "/api/v1" }],
      },
    }),
  ],
});

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/api/v1",
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
