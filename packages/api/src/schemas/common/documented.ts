import type { Route } from "@orpc/server";
import { JSON_SCHEMA_OUTPUT_REGISTRY } from "@orpc/zod/zod4";
import * as z from "zod";

/** Clears every `additionalProperties: false`, so the document allows fields beyond the listed ones. */
function openObjects(json: unknown): unknown {
  if (Array.isArray(json)) return json.map(openObjects);
  if (typeof json !== "object" || json === null) return json;
  return Object.fromEntries(
    Object.entries(json)
      .filter(([key, value]) => !(key === "additionalProperties" && value === false))
      .map(([key, value]) => [key, openObjects(value)]),
  );
}

/**
 * Puts `schema` in the OpenAPI document without validating responses against
 * it: the returned schema accepts anything at runtime. `open` documents a body
 * passed through from Cosmo, which may carry fields the schema leaves out.
 */
export function documented<T extends z.ZodType>(schema: T, options?: { open?: boolean }) {
  const wrapper = z.custom<z.output<T>>();
  const { $schema: _, ...json } = z.toJSONSchema(schema, { io: "output" });
  // the converter's own result for z.custom is { not: {} }, which hides the content unless cleared
  JSON_SCHEMA_OUTPUT_REGISTRY.add(wrapper, {
    ...(options?.open ? (openObjects(json) as typeof json) : json),
    not: undefined,
  } as never);
  return wrapper;
}

type OperationObject = Exclude<NonNullable<Route["spec"]>, (...args: never) => unknown>;

const errorDescriptions = {
  400: "Invalid input",
  404: "Not found",
  429: "Too many requests",
} as const;

/** The body oRPC sends for an error it raises without a declared `.errors()` entry. */
const errorBodySchema = {
  type: "object",
  properties: {
    defined: { type: "boolean" },
    code: { type: "string" },
    status: { type: "integer" },
    message: { type: "string" },
    data: {},
  },
  required: ["defined", "code", "status", "message"],
};

/**
 * A route `spec` that documents the error statuses an operation can return. It changes
 * only the document; declaring `.errors()` instead would also mark those errors as
 * defined at runtime.
 */
export function errorResponses(...statuses: (keyof typeof errorDescriptions)[]) {
  return (current: OperationObject): OperationObject => ({
    ...current,
    responses: {
      ...current.responses,
      ...(Object.fromEntries(
        statuses.map((status) => [
          status,
          {
            description: errorDescriptions[status],
            content: { "application/json": { schema: errorBodySchema } },
          },
        ]),
      ) as OperationObject["responses"]),
    },
  });
}
