import { BellIcon, ChecksIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Notification } from "@repo/api/schemas/notification";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { notificationKeys, notificationsOptions, unreadCountOptions } from "./queries";
import { useUserSocket } from "./use-user-socket";

type Collections = Outputs["notifications"]["list"]["collections"];

export function NotificationBell() {
  const live = useUserSocket();
  const { data: unread = 0 } = useQuery(unreadCountOptions(live));
  const [open, setOpen] = useState(false);
  // the popup itself, not its first button: that one is Mark all read
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              unread > 0
                ? m.notification_bell_label_unread({ count: unread })
                : m.notification_bell_label()
            }
            className="relative shrink-0"
          />
        }
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden
            className="bg-accent-solid ring-background absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverPopup
        ref={popupRef}
        initialFocus={popupRef}
        align="end"
        padding="none"
        className="w-[min(--spacing(96),calc(100vw-(--spacing(6))))]"
      >
        <NotificationPanel unread={unread} onNavigate={() => setOpen(false)} />
      </PopoverPopup>
    </Popover>
  );
}

function NotificationPanel({ unread, onNavigate }: { unread: number; onNavigate: () => void }) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(notificationsOptions());
  // the panel mounts on open, so times read relative to that moment
  const [now] = useState(Date.now);

  const refetch = () =>
    Promise.all(notificationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const markAllRead = useMutation(
    orpc.notifications.markAllRead.mutationOptions({ onSettled: refetch }),
  );
  const markRead = useMutation(orpc.notifications.markRead.mutationOptions({ onSettled: refetch }));

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const collections: Collections = Object.assign(
    {},
    ...(query.data?.pages.map((page) => page.collections) ?? []),
  );

  return (
    <div className="flex max-h-128 flex-col">
      <div className="flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
        <PopoverTitle className="font-display text-base">{m.notification_title()}</PopoverTitle>
        <Button
          variant="ghost"
          size="sm"
          disabled={unread === 0}
          loading={markAllRead.isPending}
          onClick={() => markAllRead.mutate(undefined)}
        >
          <ChecksIcon />
          {m.notification_mark_all_read()}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isPending ? (
          <NotificationSkeleton />
        ) : query.isError ? (
          <div className="flex flex-col items-start gap-2 px-4 py-6">
            <p className="text-destructive-foreground text-sm text-pretty">
              {m.notification_error()}
            </p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {m.common_error_retry()}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellIcon}
            bordered={false}
            title={m.notification_empty()}
            hint={m.notification_empty_hint()}
            action={
              <Button variant="outline" size="sm" render={<Link to="/list" />} onClick={onNavigate}>
                {m.nav_manage_list()}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col py-1">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationItem
                  notification={item}
                  collections={collections}
                  now={now}
                  onOpen={() => {
                    if (item.readAt === null) markRead.mutate({ ids: [item.id] });
                    onNavigate();
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {query.hasNextPage ? (
          <div className="flex justify-center border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {m.notification_load_more()}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-3">
          <Skeleton className="h-10 w-7 shrink-0 rounded" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  collections,
  now,
  onOpen,
}: {
  notification: Notification;
  collections: Collections;
  now: number;
  onOpen: () => void;
}) {
  const text = notificationText(notification, collections);
  // an older tab skips a type a newer server sends
  if (text === null) return null;

  const latest = notification.payload.latest[0];
  const thumbnail = latest ? collections[latest.collectionSlug]?.thumbnailImage : undefined;
  const unread = notification.readAt === null;

  return (
    <Link
      to="/trade/for-you"
      search={{ list: notification.payload.list.slug }}
      onClick={onOpen}
      className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex items-start gap-3 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="h-10 w-7 shrink-0 rounded object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <span className="bg-muted h-10 w-7 shrink-0 rounded" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm text-pretty",
            unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {text}
        </span>
        <time dateTime={notification.createdAt} className="text-muted-foreground text-xs">
          {relativeTime(new Date(notification.createdAt).getTime(), now)}
        </time>
      </span>
      {unread ? (
        <span className="mt-1.5 flex size-2 shrink-0">
          <span className="bg-accent-solid size-full rounded-full" />
          <span className="sr-only">{m.notification_unread()}</span>
        </span>
      ) : null}
    </Link>
  );
}

function collectionName(slug: string, collections: Collections) {
  const collection = collections[slug];
  return collection ? `${collection.member} ${collection.collectionNo}` : slug;
}

function notificationText(notification: Notification, collections: Collections) {
  const { list, count, latest } = notification.payload;
  const first = latest[0];
  if (!first) return null;
  const params = {
    count,
    list: list.name,
    partner: first.partnerName,
    objekt: collectionName(first.collectionSlug, collections),
  };

  switch (notification.type) {
    case "want_match":
      return count > 1
        ? m.notification_want_match_multiple(params)
        : m.notification_want_match_single(params);
    case "have_wanted":
      return count > 1
        ? m.notification_have_wanted_multiple(params)
        : m.notification_have_wanted_single(params);
    default:
      return null;
  }
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function relativeTime(at: number, now: number) {
  const seconds = Math.round((at - now) / 1000);
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "second");
}
