import * as z from "zod";

import { offerPayloadSchema, tradePayloadSchema } from "./offer";

export const NOTIFICATION_TYPES = ["want_match", "have_wanted", "offer", "trade"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** A type with no `notification_pref` row uses its default. */
export const NOTIFICATION_DEFAULTS: Record<NotificationType, boolean> = {
  want_match: true,
  have_wanted: false,
  offer: true,
  trade: true,
};

export const NOTIFICATION_PAGE_SIZE = 20;
/** Read notifications and sent-alert keys older than this are deleted. */
export const RETENTION_DAYS = 90;
export const LATEST_LIMIT = 3;

const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

const listRefSchema = z.object({ id: z.number(), slug: z.string(), name: z.string() });

const alertMatchSchema = z.object({
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

/** A moderator's notice; never grouped, and not something a user can turn off. */
const sanctionPayloadSchema = z.object({
  action: z.enum(["warn", "chat_mute", "trade_block"]),
  reason: z.string(),
  endsAt: z.string().nullable(),
});
export type SanctionPayload = z.infer<typeof sanctionPayloadSchema>;

/** Every type the bell lists; `NOTIFICATION_TYPES` are only the ones with a preference. */
export const LISTED_NOTIFICATION_TYPES = [...NOTIFICATION_TYPES, "sanction"] as const;

/** How many of a group's earlier notifications a row carries. */
export const EARLIER_LIMIT = 10;

const offerNoteSchema = z.object({
  ...rowFields,
  type: z.literal("offer"),
  payload: offerPayloadSchema,
});
const tradeNoteSchema = z.object({
  ...rowFields,
  type: z.literal("trade"),
  payload: tradePayloadSchema,
});

/** A trade's or conversation's notifications show as one row: the newest, with the rest under it. */
const groupFields = <T extends z.ZodTypeAny>(note: T) => ({
  updates: z.number().int().positive().optional(),
  earlier: note.array().max(EARLIER_LIMIT).optional(),
});

export const notificationSchema = z.discriminatedUnion("type", [
  z.object({ ...rowFields, type: z.literal("want_match"), payload: alertPayloadSchema }),
  z.object({ ...rowFields, type: z.literal("have_wanted"), payload: alertPayloadSchema }),
  z.object({ ...rowFields, type: z.literal("sanction"), payload: sanctionPayloadSchema }),
  offerNoteSchema.extend(groupFields(offerNoteSchema)),
  tradeNoteSchema.extend(groupFields(tradeNoteSchema)),
]);
export type Notification = z.infer<typeof notificationSchema>;
export type NoteEvent = z.infer<typeof offerNoteSchema> | z.infer<typeof tradeNoteSchema>;

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,6})?(Z|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)$/;

/** A timestamp as Postgres writes it (`2026-10-17 00:00:00.123456+00`) or as ISO 8601, a real calendar day. */
export function isTimestamp(value: string) {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  // Postgres has no year 0
  if (Number(year) === 0) return false;
  // setUTCFullYear, since Date.UTC reads years 0 to 99 as 19xx
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
}

/** The last row of the previous page; `at` is its `created_at` exactly as the database wrote it. */
const notificationCursorSchema = z.object({
  at: z.string().refine(isTimestamp, "Not a timestamp"),
  id: z.number().int(),
});
export type NotificationCursor = z.infer<typeof notificationCursorSchema>;

export const NOTIFICATION_KINDS = ["all", "trades", "alerts"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** The types each bell tab lists; `all` also lists sanction notices. */
export const KIND_TYPES: Record<Exclude<NotificationKind, "all">, readonly NotificationType[]> = {
  trades: ["offer", "trade"],
  alerts: ["want_match", "have_wanted"],
};

export const listNotificationsInputSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS).default("all"),
  cursor: notificationCursorSchema.optional(),
});

export const markAllReadInputSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS).default("all"),
});

export const markReadInputSchema = z.object({
  ids: z.number().int().positive().array().min(1).max(100),
});

export const setPrefInputSchema = z.object({
  type: notificationTypeSchema,
  enabled: z.boolean(),
});
