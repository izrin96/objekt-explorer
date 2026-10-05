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
