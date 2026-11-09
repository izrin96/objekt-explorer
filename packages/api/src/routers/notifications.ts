import { authed } from "../orpc";
import {
  listNotificationsInputSchema,
  markAllReadInputSchema,
  markReadInputSchema,
  setAlertMatchInputSchema,
  setPrefInputSchema,
} from "../schemas/notification";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  notificationPrefs,
  setAlertMatch,
  setNotificationPref,
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
    .handler(({ input: { ids }, context: { session } }) =>
      markNotificationsRead(session.user.id, ids),
    ),

  /** A tab's `kind` is ignored: Mark all read is account-wide. */
  markAllRead: authed
    .input(markAllReadInputSchema)
    .handler(({ context: { session } }) => markAllNotificationsRead(session.user.id)),

  prefs: authed.handler(({ context: { session } }) => notificationPrefs(session.user.id)),

  setPref: authed
    .input(setPrefInputSchema)
    .handler(({ input, context: { session } }) => setNotificationPref(session.user.id, input)),

  setAlertMatch: authed
    .input(setAlertMatchInputSchema)
    .handler(({ input, context: { session } }) => setAlertMatch(session.user.id, input)),
};
