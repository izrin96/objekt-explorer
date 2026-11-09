import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { openApiRouter } from "@repo/api";

import { logORPCError } from "./orpc-error-log";

const handler = new OpenAPIHandler(openApiRouter, {
  interceptors: [onError((error, { request }) => logORPCError(error, request))],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsTitle: "Objekt Tracker API",
      specGenerateOptions: {
        info: { title: "Objekt Tracker API", version: "1.0.0" },
        servers: [{ url: "/api/v1" }],
      },
    }),
  ],
});

/** `/api/v1`, the public API, for the routes that serve it. */
export async function handleOpenApi(request: Request): Promise<Response> {
  const { response } = await handler.handle(request, {
    prefix: "/api/v1",
    context: { headers: request.headers },
  });
  return response ?? new Response("Not Found", { status: 404 });
}
