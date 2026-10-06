import type { NotificationCursor } from "@repo/api/schemas/notification";

import { orpc } from "@/lib/orpc";

const POLL_MS = 60_000;

/** Polls only while the live socket is down; focus always refetches. */
export const unreadCountOptions = (live: boolean) =>
  orpc.notifications.unreadCount.queryOptions({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: live ? false : POLL_MS,
  });

export const notificationsOptions = () =>
  orpc.notifications.list.infiniteOptions({
    input: (cursor: NotificationCursor | undefined) => ({ cursor }),
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
