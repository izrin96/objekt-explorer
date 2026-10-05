import * as z from "zod";

import { artistsArraySchema } from "./common/artist";

export const targetTypeSchema = z.enum(["profile", "list"]);
export const modeSchema = z.enum(["missing", "matches"]);

export const compareInputSchema = z.object({
  sourceId: z.string(),
  targetType: targetTypeSchema,
  targetProfile: z.string().optional(),
  targetListId: z.string().optional(),
  mode: modeSchema,
  /** an omitted `artist` means every artist */
  artist: artistsArraySchema.default([]),
});

export type CompareInput = z.infer<typeof compareInputSchema>;
