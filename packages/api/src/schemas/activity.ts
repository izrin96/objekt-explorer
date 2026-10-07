import type { OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { timestampCursorSchema } from "./common/cursor";
import { collectionFiltersSchema } from "./common/filters";
import { ownedObjektSchema } from "./common/objekt";
import { transferNicknamesSchema, transferRowSchema } from "./common/transfer";

/** the socket parses live rows with this in the browser, so its objekt stays unchecked */
const activityItemSchema = z.object({
  transfer: transferRowSchema.extend({ hash: z.string() }),
  objekt: z.custom<OwnedObjekt>(),
  nickname: transferNicknamesSchema,
});
export type ActivityItem = z.infer<typeof activityItemSchema>;

/** what the activity socket sends: live batches, and the backlog replayed on request */
export const activityMessageSchema = z.object({
  type: z.enum(["transfer", "history"]),
  data: z.array(activityItemSchema),
});
export type ActivityMessage = z.infer<typeof activityMessageSchema>;

/** what a client may send the activity socket */
export const activityClientMessageSchema = z.object({
  type: z.literal("request_history"),
});
export type ActivityClientMessage = z.infer<typeof activityClientMessageSchema>;

export const activityFeedOutputSchema = z.object({
  items: z.array(activityItemSchema.extend({ objekt: ownedObjektSchema })),
  nextCursor: timestampCursorSchema.optional(),
});
export type ActivityFeedOutput = z.infer<typeof activityFeedOutputSchema>;

export const activityTypeSchema = z.enum(["all", "mint", "transfer", "spin"]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

/** activity feed input; the legacy `GET /api/activity` sends the cursor as JSON */
export const activityFeedInputSchema = z.object({
  type: activityTypeSchema.default("all"),
  ...collectionFiltersSchema.shape,
  cursor: timestampCursorSchema.optional(),
});
export type ActivityFeedInput = z.infer<typeof activityFeedInputSchema>;
/** what the client sends; the cursor is added per page */
export type ActivityParams = Omit<z.input<typeof activityFeedInputSchema>, "cursor">;
