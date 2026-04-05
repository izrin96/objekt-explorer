import * as z from "zod";

export const targetTypeSchema = z.enum(["profile", "list"]);
export const modeSchema = z.enum(["missing", "matches"]);

export const compareInputSchema = z
  .object({
    sourceId: z.string(),
    targetType: targetTypeSchema,
    targetAddress: z.string().optional(),
    targetListId: z.string().optional(),
    mode: modeSchema,
  })
  .refine(
    (data) => {
      if (data.targetType === "profile") return data.targetAddress !== undefined;
      return true;
    },
    { message: "targetAddress is required when targetType is 'profile'", path: ["targetAddress"] },
  )
  .refine(
    (data) => {
      if (data.targetType === "list") return data.targetListId !== undefined;
      return true;
    },
    { message: "targetListId is required when targetType is 'list'", path: ["targetListId"] },
  );

export type CompareInput = z.infer<typeof compareInputSchema>;
