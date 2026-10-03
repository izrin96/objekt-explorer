import { validOnlineTypes } from "@repo/cosmo/types/common";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { artistsArraySchema } from "./artist";
import { checkpointSchema } from "./checkpoint";

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

const transferCursorSchema = z.object({
  timestamp: z.string(),
  id: z.string(),
});

export const transferResultSchema = z.object({
  hide: z.boolean().optional(),
  results: z.array(aggregatedTransferSchema),
  nextCursor: transferCursorSchema.optional(),
});
export type TransferResult = z.infer<typeof transferResultSchema>;

export const validType = ["all", "mint", "received", "sent", "spin"] as const;
export type ValidType = (typeof validType)[number];

/** `GET /api/transfers/$address` search params; the cursor travels as JSON */
export const transfersQuerySchema = z.object({
  type: z.enum(validType).default("all"),
  artist: artistsArraySchema,
  member: z.string().array(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
  at: checkpointSchema.optional(),
  cursor: transferCursorSchema.optional(),
});
export type TransfersQuery = z.infer<typeof transfersQuerySchema>;
/** what the client sends: an omitted facet reads as empty, and the cursor is added per page */
export type TransfersParams = Partial<Omit<z.input<typeof transfersQuerySchema>, "cursor">>;
