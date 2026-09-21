import { modeSchema, targetTypeSchema } from "@repo/api/schemas/compare";
import * as z from "zod";

/**
 * Compare is not a page: it is three parameters on the list detail routes, so
 * a comparison survives a reload, can be shared, and is gone the moment
 * another list is opened.
 */
export const compareSearchSchema = z.object({
  cmp_type: targetTypeSchema.optional().catch(undefined),
  cmp_to: z.string().min(1).optional().catch(undefined),
  cmp_mode: modeSchema.optional().catch(undefined),
});

export type CompareSearch = z.infer<typeof compareSearchSchema>;

/** the same three once all of them are set; two thirds of a comparison is not one */
export type ActiveCompare = { [K in keyof CompareSearch]-?: NonNullable<CompareSearch[K]> };

export function isComparing(search: CompareSearch): search is ActiveCompare {
  return (
    search.cmp_type !== undefined && search.cmp_to !== undefined && search.cmp_mode !== undefined
  );
}
