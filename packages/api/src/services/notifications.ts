import { db } from "@repo/db";
import { notification, notificationPref } from "@repo/db/schema";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type * as z from "zod";

import { iso } from "../lib/time";
import {
  type listNotificationsInputSchema,
  LISTED_NOTIFICATION_TYPES,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_TYPES,
  type NotificationType,
  notificationSchema,
  RETENTION_DAYS,
} from "../schemas/notification";
import { fetchCollectionsBySlug } from "./list";

export async function listNotifications(
  userId: string,
  { cursor }: z.infer<typeof listNotificationsInputSchema>,
) {
  const rows = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
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
      readAt: iso(row.readAt),
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
        {
          member: c.member,
          artist: c.artist,
          season: c.season,
          collectionNo: c.collectionNo,
          thumbnailImage: c.thumbnailImage,
        },
      ]),
    ),
  };
}

export function unreadNotificationCount(userId: string) {
  return db.$count(
    notification,
    and(
      eq(notification.userId, userId),
      isNull(notification.readAt),
      inArray(notification.type, [...LISTED_NOTIFICATION_TYPES]),
    ),
  );
}

export async function notificationPrefs(userId: string) {
  const rows = await db
    .select({ type: notificationPref.type, enabled: notificationPref.enabled })
    .from(notificationPref)
    .where(eq(notificationPref.userId, userId));
  const stored = new Map(rows.map((row) => [row.type, row.enabled]));
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, stored.get(type) ?? NOTIFICATION_DEFAULTS[type]]),
  ) as Record<NotificationType, boolean>;
}
