import { db } from "@repo/db";
import { notification, notificationPref } from "@repo/db/schema";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

import { authed } from "../orpc";
import {
  LISTED_NOTIFICATION_TYPES,
  listNotificationsInputSchema,
  markReadInputSchema,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_TYPES,
  type NotificationType,
  RETENTION_DAYS,
  notificationSchema,
  setPrefInputSchema,
} from "../schemas/notification";
import { fetchCollectionsBySlug } from "../services/list";
import { publishNotify } from "../user-socket";

export const notificationsRouter = {
  list: authed
    .input(listNotificationsInputSchema)
    .handler(async ({ input: { cursor }, context: { session } }) => {
      const rows = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, session.user.id),
            // the weekly prune may not have reached a read notification past retention yet
            or(
              isNull(notification.readAt),
              gt(notification.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`),
            ),
            cursor === undefined
              ? undefined
              : sql`(${notification.createdAt}, ${notification.id}) < (${cursor.at}::timestamptz, ${cursor.id})`,
          ),
        )
        .orderBy(desc(notification.createdAt), desc(notification.id))
        .limit(NOTIFICATION_PAGE_SIZE + 1);

      const page = rows.slice(0, NOTIFICATION_PAGE_SIZE);
      const last = page.at(-1);
      // a type this server does not know yet is dropped, not an error
      const items = page.flatMap((row) => {
        const parsed = notificationSchema.safeParse({
          id: row.id,
          type: row.type,
          payload: row.payload,
          readAt: row.readAt === null ? null : new Date(row.readAt).toISOString(),
          createdAt: new Date(row.createdAt).toISOString(),
        });
        return parsed.success ? [parsed.data] : [];
      });

      const collections = await fetchCollectionsBySlug(
        items.flatMap((item) =>
          item.type === "want_match" || item.type === "have_wanted"
            ? item.payload.latest.map((match) => match.collectionSlug)
            : [],
        ),
        [],
      );

      return {
        items,
        nextCursor:
          rows.length > NOTIFICATION_PAGE_SIZE && last ? { at: last.createdAt, id: last.id } : null,
        collections: Object.fromEntries(
          collections.map((c) => [
            c.slug,
            { member: c.member, collectionNo: c.collectionNo, thumbnailImage: c.thumbnailImage },
          ]),
        ),
      };
    }),

  unreadCount: authed.handler(async ({ context: { session } }) =>
    db.$count(
      notification,
      and(
        eq(notification.userId, session.user.id),
        isNull(notification.readAt),
        inArray(notification.type, [...LISTED_NOTIFICATION_TYPES]),
      ),
    ),
  ),

  markRead: authed
    .input(markReadInputSchema)
    .handler(async ({ input: { ids }, context: { session } }) => {
      const updated = await db
        .update(notification)
        .set({ readAt: sql`now()` })
        .where(
          and(
            eq(notification.userId, session.user.id),
            inArray(notification.id, ids),
            isNull(notification.readAt),
          ),
        )
        .returning({ id: notification.id });
      if (updated.length > 0) await publishNotify(session.user.id);
    }),

  markAllRead: authed.handler(async ({ context: { session } }) => {
    const updated = await db
      .update(notification)
      .set({ readAt: sql`now()` })
      .where(and(eq(notification.userId, session.user.id), isNull(notification.readAt)))
      .returning({ id: notification.id });
    if (updated.length > 0) await publishNotify(session.user.id);
  }),

  prefs: authed.handler(async ({ context: { session } }) => {
    const rows = await db
      .select({ type: notificationPref.type, enabled: notificationPref.enabled })
      .from(notificationPref)
      .where(eq(notificationPref.userId, session.user.id));
    const stored = new Map(rows.map((row) => [row.type, row.enabled]));
    return Object.fromEntries(
      NOTIFICATION_TYPES.map((type) => [type, stored.get(type) ?? NOTIFICATION_DEFAULTS[type]]),
    ) as Record<NotificationType, boolean>;
  }),

  setPref: authed
    .input(setPrefInputSchema)
    .handler(async ({ input: { type, enabled }, context: { session } }) => {
      await db
        .insert(notificationPref)
        .values({ userId: session.user.id, type, enabled })
        .onConflictDoUpdate({
          target: [notificationPref.userId, notificationPref.type],
          set: { enabled },
        });
    }),
};
