import * as z from "zod";

import { artistsArraySchema } from "./common/artist";

export const targetTypeSchema = z.enum(["profile", "list"]);
export const modeSchema = z.enum(["missing", "matches"]);

const compareBaseSchema = z.object({
  sourceId: z.string(),
  mode: modeSchema,
  artist: artistsArraySchema.default([]),
});

/** each target type carries its own target, so neither can arrive empty */
export const compareInputSchema = z.discriminatedUnion("targetType", [
  compareBaseSchema.extend({ targetType: z.literal("profile"), targetProfile: z.string().min(1) }),
  compareBaseSchema.extend({ targetType: z.literal("list"), targetListId: z.string().min(1) }),
]);

export type CompareInput = z.infer<typeof compareInputSchema>;
