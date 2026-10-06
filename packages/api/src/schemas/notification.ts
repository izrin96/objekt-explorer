import * as z from "zod";

export const NOTIFICATION_TYPES = ["want_match", "have_wanted"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** A type with no `notification_pref` row uses its default. */
export const NOTIFICATION_DEFAULTS: Record<NotificationType, boolean> = {
  want_match: true,
  have_wanted: false,
};

export const NOTIFICATION_PAGE_SIZE = 20;
/** Read notifications and sent-alert keys older than this are deleted. */
export const RETENTION_DAYS = 90;
export const LATEST_LIMIT = 3;

export const NOTIFY_PREFIX = "notify:";
export const notifyChannel = (userId: string) => `${NOTIFY_PREFIX}${userId}`;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

const listRefSchema = z.object({ id: z.number(), slug: z.string(), name: z.string() });

export const alertMatchSchema = z.object({
  collectionSlug: z.string(),
  partnerName: z.string(),
  sourceListSlug: z.string(),
});
export type AlertMatch = z.infer<typeof alertMatchSchema>;

/** Data only: the client words it, so it follows the viewer's language. */
export const alertPayloadSchema = z.object({
  list: listRefSchema,
  count: z.number().int().positive(),
  latest: alertMatchSchema.array().max(LATEST_LIMIT),
});
export type AlertPayload = z.infer<typeof alertPayloadSchema>;

const rowFields = {
  id: z.number(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
};

export const notificationSchema = z.discriminatedUnion("type", [
  z.object({ ...rowFields, type: z.literal("want_match"), payload: alertPayloadSchema }),
  z.object({ ...rowFields, type: z.literal("have_wanted"), payload: alertPayloadSchema }),
]);
export type Notification = z.infer<typeof notificationSchema>;

/** The last row of the previous page; `at` is its `created_at` exactly as the database wrote it. */
export const notificationCursorSchema = z.object({ at: z.string(), id: z.number().int() });
export type NotificationCursor = z.infer<typeof notificationCursorSchema>;

export const listNotificationsInputSchema = z.object({
  cursor: notificationCursorSchema.optional(),
});

export const markReadInputSchema = z.object({
  ids: z.number().int().positive().array().min(1).max(100),
});

export const setPrefInputSchema = z.object({
  type: notificationTypeSchema,
  enabled: z.boolean(),
});

export const userSocketMessageSchema = z.object({ type: z.literal("notifications_changed") });
export type UserSocketMessage = z.infer<typeof userSocketMessageSchema>;
