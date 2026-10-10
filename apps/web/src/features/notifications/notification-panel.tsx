import {
  ArrowClockwiseIcon,
  BellIcon,
  ChecksIcon,
  GearIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  type Notification,
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "@repo/api/schemas/notification";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PopoverTitle } from "@/components/ui/popover";
import { SheetClose, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type Collections, NotificationItem, OfferItem, SanctionItem } from "./notification-items";
import { notificationKeys, notificationsOptions } from "./queries";

const TAB_LABEL: Record<NotificationKind, () => string> = {
  all: m.notification_tab_all,
  trades: m.notification_tab_trades,
  alerts: m.notification_tab_alerts,
};

const EMPTY = {
  trades: { title: m.notification_empty_trades, hint: m.notification_empty_trades_hint },
  alerts: { title: m.notification_empty_alerts, hint: m.notification_empty_alerts_hint },
} as const;

/** The same contents in the bell's popover and, below `sm`, its full-height sheet. */
export function NotificationPanel({
  unread,
  onNavigate,
  variant = "popover",
}: {
  unread: number;
  onNavigate: () => void;
  variant?: "popover" | "sheet";
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<NotificationKind>("all");
  const query = useInfiniteQuery(notificationsOptions(kind));
  // the panel mounts on open, so times read relative to that moment
  const [now] = useState(Date.now);

  const refetch = () =>
    Promise.all(notificationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const markAllRead = useMutation(
    orpc.notifications.markAllRead.mutationOptions({ onSettled: refetch }),
  );
  const markRead = useMutation(orpc.notifications.markRead.mutationOptions({ onSettled: refetch }));

  const readIfUnread = (item: Notification) => {
    if (item.readAt === null) markRead.mutate({ ids: [item.id] });
  };

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const empty = query.isSuccess && items.length === 0;
  const collections: Collections = Object.assign(
    {},
    ...(query.data?.pages.map((page) => page.collections) ?? []),
  );

  return (
    <div className={cn("flex flex-col", variant === "sheet" ? "min-h-0 flex-1" : "max-h-128")}>
      <div className="flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
        <div className="flex min-w-0 items-baseline gap-2">
          {variant === "sheet" ? (
            <SheetTitle className="font-display text-base">{m.notification_title()}</SheetTitle>
          ) : (
            <PopoverTitle className="font-display text-base">{m.notification_title()}</PopoverTitle>
          )}
          {unread > 0 ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {m.notification_unread_count({ count: unread })}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {empty && kind === "all" ? null : (
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
          {variant === "sheet" ? (
            <SheetClose
              render={<Button variant="ghost" size="icon" aria-label={m.common_modal_close()} />}
            >
              <XIcon />
            </SheetClose>
          ) : null}
        </div>
      </div>

      <Tabs
        value={kind}
        onValueChange={(value) => {
          const next = NOTIFICATION_KINDS.find((item) => item === value);
          if (next) setKind(next);
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          variant="underline"
          aria-label={m.notification_tabs_label()}
          className="text-muted-foreground w-full shrink-0 justify-start gap-0.5 border-b px-2 py-0 *:data-[slot=tabs-tab]:hover:bg-transparent"
        >
          {NOTIFICATION_KINDS.map((item) => (
            <TabsTab
              key={item}
              value={item}
              className="hover:text-foreground data-active:text-foreground h-10 grow-0 rounded-none px-3"
            >
              {TAB_LABEL[item]()}
            </TabsTab>
          ))}
        </TabsList>
        <TabsPanel value={kind} className="relative min-h-0 flex-1 overflow-y-auto">
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
          ) : empty && kind !== "all" ? (
            <EmptyState
              icon={BellIcon}
              bordered={false}
              title={EMPTY[kind].title()}
              hint={EMPTY[kind].hint()}
            />
          ) : empty ? (
            <EmptyState
              icon={BellIcon}
              bordered={false}
              title={m.notification_empty()}
              hint={m.notification_empty_hint()}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to="/list" />}
                  onClick={onNavigate}
                >
                  {m.notification_go_to_lists()}
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col py-1">
              {items.map((item) => (
                <li key={item.id}>
                  {item.type === "sanction" ? (
                    <SanctionItem notification={item} now={now} onRead={() => readIfUnread(item)} />
                  ) : item.type === "offer" || item.type === "trade" ? (
                    <OfferItem
                      notification={item}
                      now={now}
                      onOpen={() => {
                        readIfUnread(item);
                        onNavigate();
                      }}
                    />
                  ) : item.type === "want_match" || item.type === "have_wanted" ? (
                    <NotificationItem
                      notification={item}
                      collections={collections}
                      now={now}
                      onOpen={() => {
                        readIfUnread(item);
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
        </TabsPanel>
      </Tabs>
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
