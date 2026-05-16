import type { OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

const partialTransferSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string(),
  hash: z.string(),
});

export const activityDataSchema = z.object({
  transfer: partialTransferSchema,
  objekt: z.custom<OwnedObjekt>(),
  nickname: z.object({
    from: z.string().nullish(),
    to: z.string().nullish(),
  }),
});
export type ActivityData = z.infer<typeof activityDataSchema>;

export const activityResponseSchema = z.object({
  items: z.array(activityDataSchema),
  nextCursor: z.object({ id: z.string() }).optional(),
});
export type ActivityResponse = z.infer<typeof activityResponseSchema>;

export const validType = ["all", "mint", "transfer", "spin"] as const;
export type ValidType = (typeof validType)[number];
