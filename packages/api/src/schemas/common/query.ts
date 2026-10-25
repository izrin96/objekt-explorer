import * as z from "zod";

/**
 * An array that may arrive in a query string, where OpenAPI reads one `?k=v`
 * as a plain value and only a repeated key as an array.
 */
export function queryArray<T extends z.ZodType>(item: T) {
  return z
    .union([item, z.array(item)])
    .transform((value) => (Array.isArray(value) ? value : [value]));
}

/** A boolean that may arrive in a query string as `true` or `false`. */
export const queryBoolean = z.union([z.boolean(), z.stringbool()]);

/** An object that may arrive in a query string as JSON, as a feed cursor does on `/api/v1`. */
export function queryJson<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }, schema);
}
