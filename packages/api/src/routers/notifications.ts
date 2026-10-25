import { db } from "@repo/db";
import { notification, notificationPref } from "@repo/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { authed } from "../orpc";
import { publishNotify } from "../realtime";
import {
  KIND_TYPES,
  listNotificationsInputSchema,
  markAllReadInputSchema,
  markReadInputSchema,
  setAlertMatchInputSchema,
  setPrefInputSchema,
} from "../schemas/notification";
import {
  listNotifications,
  notificationPrefs,
  unreadNotificationCount,
} from "../services/notifications";

export const notificationsRouter = {
  list: authed
    .input(listNotificationsInputSchema)
    .handler(({ input, context: { session } }) => listNotifications(session.user.id, input)),

  unreadCount: authed.handler(({ context: { session } }) =>
    unreadNotificationCount(session.user.id),
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

  /** Only the open tab's kind, so Mark all read on Trades leaves list alerts unread. */
  markAllRead: authed
    .input(markAllReadInputSchema)
    .handler(async ({ input: { kind }, context: { session } }) => {
      const updated = await db
        .update(notification)
        .set({ readAt: sql`now()` })
        .where(
          and(
            eq(notification.userId, session.user.id),
            isNull(notification.readAt),
            kind === "all" ? undefined : inArray(notification.type, [...KIND_TYPES[kind]]),
          ),
        )
        .returning({ id: notification.id });
      if (updated.length > 0) await publishNotify(session.user.id);
    }),

  prefs: authed.handler(({ context: { session } }) => notificationPrefs(session.user.id)),

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

  /** One statement, so a choice never leaves `enabled` and `match` half-written; Off keeps the stored match. */
  setAlertMatch: authed
    .input(setAlertMatchInputSchema)
    .handler(async ({ input: { type, choice }, context: { session } }) => {
      const enabled = choice !== "off";
      const match = choice === "off" ? null : choice;
      await db
        .insert(notificationPref)
        .values({ userId: session.user.id, type, enabled, match })
        .onConflictDoUpdate({
          target: [notificationPref.userId, notificationPref.type],
          set: match === null ? { enabled } : { enabled, match },
        });
    }),
};
