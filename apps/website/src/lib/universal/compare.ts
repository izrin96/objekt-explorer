import * as z from "zod";

export const targetTypeSchema = z.enum(["profile", "list"]);
export const modeSchema = z.enum(["missing", "matches"]);

export const compareInputSchema = z.object({
  sourceId: z.string(),
  targetType: targetTypeSchema,
  targetProfile: z.string().optional(),
  targetListId: z.string().optional(),
  mode: modeSchema,
});

export type CompareInput = z.infer<typeof compareInputSchema>;
