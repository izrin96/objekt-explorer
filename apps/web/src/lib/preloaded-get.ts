import { createORPCErrorFromJson, isORPCErrorJson } from "@orpc/client";
import { ofetch } from "ofetch";

/**
 * A plain GET of an `/api/v1` URL a route's `head` preloads, so the browser reuses the response it
 * started beside the scripts; RPC would ask again. An error comes back as the oRPC error RPC would
 * throw, which is what the retry default, the error reporting and `refusalText` read.
 */
export function preloadedGet<T>(url: string) {
  return ofetch<T>(url).catch((error: unknown) => {
    const body = (error as { data?: unknown }).data;
    throw isORPCErrorJson(body) ? createORPCErrorFromJson(body) : error;
  });
}
