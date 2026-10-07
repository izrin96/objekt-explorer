import {
  ArrowClockwiseIcon,
  BellIcon,
  ChecksIcon,
  GearIcon,
  HandshakeIcon,
  ShieldWarningIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Notification } from "@repo/api/schemas/notification";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { CountBadge } from "@/components/shared/count-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { untilLabel } from "@/features/chat/format";
import { collectionName } from "@/features/objekt/objekt-label";
import { offerNotificationText, tradeNotificationText } from "@/features/offers/format";
import { orpc } from "@/lib/orpc";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { notificationKeys, notificationsOptions, unreadCountOptions } from "./queries";

type Collections = Outputs["notifications"]["list"]["collections"];

/** The bell polls while the tab's user socket is down. */
export function NotificationBell() {
  const live = useUserSocketLive((state) => state.live);
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
        <CountBadge count={unread} />
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
  const empty = query.isSuccess && items.length === 0;
  const collections: Collections = Object.assign(
    {},
    ...(query.data?.pages.map((page) => page.collections) ?? []),
  );

  return (
    <div className="flex max-h-128 flex-col">
      <div className="flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
        <PopoverTitle className="font-display text-base">{m.notification_title()}</PopoverTitle>
        {empty ? null : (
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
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {query.isPending ? (
          <NotificationSkeleton />
        ) : query.isError ? (
          <EmptyState
            icon={WarningIcon}
            bordered={false}
            title={m.common_error_loading_data()}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                <ArrowClockwiseIcon />
                {m.common_error_retry()}
              </Button>
            }
          />
        ) : empty ? (
          <EmptyState
            icon={BellIcon}
            bordered={false}
            title={m.notification_empty()}
            hint={m.notification_empty_hint()}
            action={
              <Button variant="outline" size="sm" render={<Link to="/list" />} onClick={onNavigate}>
                {m.notification_go_to_lists()}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col py-1">
            {items.map((item) => (
              <li key={item.id}>
                {item.type === "sanction" ? (
                  <SanctionItem
                    notification={item}
                    now={now}
                    onRead={() => {
                      if (item.readAt === null) markRead.mutate({ ids: [item.id] });
                    }}
                  />
                ) : item.type === "offer" || item.type === "trade" ? (
                  <OfferItem
                    notification={item}
                    now={now}
                    onOpen={() => {
                      if (item.readAt === null) markRead.mutate({ ids: [item.id] });
                      onNavigate();
                    }}
                  />
                ) : item.type === "want_match" || item.type === "have_wanted" ? (
                  <NotificationItem
                    notification={item}
                    collections={collections}
                    now={now}
                    onOpen={() => {
                      if (item.readAt === null) markRead.mutate({ ids: [item.id] });
                      onNavigate();
                    }}
                  />
                ) : null}
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
      <div className="flex justify-end border-t px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to="/account/notifications" />}
          onClick={onNavigate}
        >
          <GearIcon />
          {m.notification_settings_link()}
        </Button>
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

type ListNotification = Extract<Notification, { type: "want_match" | "have_wanted" }>;
type OfferNotification = Extract<Notification, { type: "offer" | "trade" }>;
type SanctionNotification = Extract<Notification, { type: "sanction" }>;

function sanctionText({ action, reason, endsAt }: SanctionNotification["payload"]) {
  switch (action) {
    case "warn":
      return m.notification_sanction_warn({ reason });
    case "chat_mute":
      return endsAt
        ? m.notification_sanction_chat_mute({ time: untilLabel(endsAt), reason })
        : m.notification_sanction_chat_mute_always({ reason });
    case "trade_block":
      return m.notification_sanction_trade_block({ reason });
    default:
      return null;
  }
}

/** A notice from moderators: it leads nowhere, so activating it only marks it read. */
function SanctionItem({
  notification,
  now,
  onRead,
}: {
  notification: SanctionNotification;
  now: number;
  onRead: () => void;
}) {
  const text = sanctionText(notification.payload);
  if (text === null) return null;
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onRead}
      className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex w-full items-start gap-3 px-4 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <span className="bg-muted text-muted-foreground grid h-10 w-7 shrink-0 place-items-center rounded">
        <ShieldWarningIcon aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs font-medium">
          {m.notification_sanction_from()}
        </span>
        <span
          className={cn(
            "text-sm text-pretty break-words",
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
    </button>
  );
}

/** Offers and trades: to the trade once there is one, else to the conversation. */
function OfferItem({
  notification,
  now,
  onOpen,
}: {
  notification: OfferNotification;
  now: number;
  onOpen: () => void;
}) {
  const { payload } = notification;
  const unread = notification.readAt === null;
  const className =
    "hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex items-start gap-3 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset";
  const body = (
    <>
      <span className="bg-muted text-muted-foreground grid h-10 w-7 shrink-0 place-items-center rounded">
        <HandshakeIcon aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm text-pretty break-words",
            unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {notification.type === "trade"
            ? tradeNotificationText(notification.payload)
            : offerNotificationText(notification.payload)}
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
    </>
  );

  return payload.tradeId !== null ? (
    <Link
      to="/trade/mine/$tradeId"
      params={{ tradeId: String(payload.tradeId) }}
      onClick={onOpen}
      className={className}
    >
      {body}
    </Link>
  ) : (
    <Link
      to="/messages/$id"
      params={{ id: String(payload.conversationId) }}
      onClick={onOpen}
      className={className}
    >
      {body}
    </Link>
  );
}

function NotificationItem({
  notification,
  collections,
  now,
  onOpen,
}: {
  notification: ListNotification;
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

function notificationText(notification: ListNotification, collections: Collections) {
  const { list, count, latest } = notification.payload;
  const first = latest[0];
  if (!first) return null;
  const params = {
    count,
    list: list.name,
    partner: first.partnerName,
    objekt: collectionName(first.collectionSlug, collections[first.collectionSlug]),
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
