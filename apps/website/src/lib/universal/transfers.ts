import type { OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

const partialTransferSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string(),
});

export const aggregatedTransferSchema = z.object({
  transfer: partialTransferSchema,
  objekt: z.custom<OwnedObjekt>(),
  nickname: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});
export type AggregatedTransfer = z.infer<typeof aggregatedTransferSchema>;

export const transferResultSchema = z.object({
  hide: z.boolean().optional(),
  results: z.array(aggregatedTransferSchema),
  nextCursor: z
    .object({
      timestamp: z.string(),
      id: z.string(),
    })
    .optional(),
});
export type TransferResult = z.infer<typeof transferResultSchema>;

export const validType = ["all", "mint", "received", "sent", "spin"] as const;
export type ValidType = (typeof validType)[number];
