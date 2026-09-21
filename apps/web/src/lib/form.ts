import type * as z from "zod";

/** what `<Form errors>` takes: one key per `<Field name>` */
export type FieldErrors = Record<string, string | string[]>;

/**
 * `z.flattenError` is the documented route, but its `fieldErrors` is
 * `Record<string, string[] | undefined>` and Base UI's `Errors` has no
 * `undefined` member, so walking the issues is both shorter and exactly typed.
 */
export function zodErrors(schema: z.ZodType, values: Record<string, unknown>): FieldErrors {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    const existing = errors[key];
    if (existing) existing.push(issue.message);
    else errors[key] = [issue.message];
  }
  return errors;
}
