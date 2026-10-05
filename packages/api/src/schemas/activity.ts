import { validOnlineTypes } from "@repo/cosmo/types/common";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { artistsArraySchema } from "./artist";
import { queryArray } from "./query";

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
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});
export type ActivityData = z.infer<typeof activityDataSchema>;

/** what the activity socket sends: live batches, and the backlog replayed on request */
export const activityMessageSchema = z.object({
  type: z.enum(["transfer", "history"]),
  data: z.array(activityDataSchema),
});
export type ActivityMessage = z.infer<typeof activityMessageSchema>;

/** what a client may send the activity socket */
export const activityClientMessageSchema = z.object({
  type: z.literal("request_history"),
});
export type ActivityClientMessage = z.infer<typeof activityClientMessageSchema>;

const activityCursorSchema = z.object({
  timestamp: z.string(),
  id: z.string(),
});
export type ActivityCursor = z.infer<typeof activityCursorSchema>;

export const activityResponseSchema = z.object({
  items: z.array(activityDataSchema),
  nextCursor: activityCursorSchema.optional(),
});
export type ActivityResponse = z.infer<typeof activityResponseSchema>;

export const validType = ["all", "mint", "transfer", "spin"] as const;
export type ValidType = (typeof validType)[number];

/** activity feed input; the legacy `GET /api/activity` sends the cursor as JSON */
export const activityQuerySchema = z.object({
  type: z.enum(validType).default("all"),
  artist: artistsArraySchema.default([]),
  member: queryArray(z.string()).default([]),
  season: queryArray(z.string()).default([]),
  class: queryArray(z.string()).default([]),
  on_offline: queryArray(z.enum(validOnlineTypes)).default([]),
  collection: queryArray(z.string()).default([]),
  cursor: activityCursorSchema.optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
/** what the client sends; the cursor is added per page */
export type ActivityParams = Omit<z.input<typeof activityQuerySchema>, "cursor">;
