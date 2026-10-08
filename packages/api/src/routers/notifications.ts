import { db } from "@repo/db";
import { notification, notificationPref } from "@repo/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { authed } from "../orpc";
import {
  listNotificationsInputSchema,
  markReadInputSchema,
  setPrefInputSchema,
} from "../schemas/notification";
import {
  listNotifications,
  notificationPrefs,
  unreadNotificationCount,
} from "../services/notifications";
import { publishNotify } from "../user-socket";

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

  markAllRead: authed.handler(async ({ context: { session } }) => {
    const updated = await db
      .update(notification)
      .set({ readAt: sql`now()` })
      .where(and(eq(notification.userId, session.user.id), isNull(notification.readAt)))
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
};
