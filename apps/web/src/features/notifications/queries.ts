import type { NotificationCursor, NotificationKind } from "@repo/api/schemas/notification";

import { orpc } from "@/lib/orpc";
import { pollUnlessLive } from "@/stores/user-socket";

/** Polls only while the live socket is down; focus always refetches. */
export const unreadCountOptions = (live: boolean) =>
  orpc.notifications.unreadCount.queryOptions({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: pollUnlessLive(live),
  });

export const notificationsOptions = (kind: NotificationKind = "all") =>
  orpc.notifications.list.infiniteOptions({
    input: (cursor: NotificationCursor | undefined) => ({ kind, cursor }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });

export const notificationPrefsOptions = () =>
  orpc.notifications.prefs.queryOptions({ staleTime: 0 });

export const notificationKeys = [
  orpc.notifications.unreadCount.key(),
  orpc.notifications.list.key(),
] as const;
