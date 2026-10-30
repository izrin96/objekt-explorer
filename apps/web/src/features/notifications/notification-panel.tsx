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
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

import { type Collections, NotificationRow, type RowVariant } from "./notification-items";
import { notificationKeys, notificationPrefsOptions, notificationsOptions } from "./queries";
import { type Section, SECTIONS, sectionOf } from "./sections";

const TAB_LABEL: Record<NotificationKind, () => string> = {
  all: m.notification_tab_all,
  trades: m.notification_tab_trades,
  alerts: m.notification_tab_alerts,
};

const SECTION_LABEL: Record<Section, () => string> = {
  "needs-you": m.notification_section_needs_you,
  today: m.notification_section_today,
  week: m.notification_section_week,
  earlier: m.notification_section_earlier,
};

const EMPTY = {
  all: {
    title: m.notification_empty,
    hint: m.notification_empty_hint,
    action: m.notification_go_to_lists,
    to: "/list",
  },
  trades: {
    title: m.notification_empty_trades,
    hint: m.notification_empty_trades_hint,
    action: m.notification_go_to_trades,
    to: "/trade",
  },
  alerts: {
    title: m.notification_empty_alerts,
    hint: m.notification_empty_alerts_hint,
    action: m.notification_make_want_list,
    to: "/list",
  },
} as const;

/** The same contents in the bell's popover and, below `sm`, its full-height sheet. */
export function NotificationPanel({
  unread,
  onNavigate,
  variant = "popover",
}: {
  unread: number;
  onNavigate: () => void;
  variant?: RowVariant;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<NotificationKind>("all");
  const query = useInfiniteQuery(notificationsOptions(kind));
  const { data: prefs } = useQuery(notificationPrefsOptions());
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
  const tradeNotes = prefs?.enabled.trade ?? true;
  const sections = Map.groupBy(items, (item) => sectionOf(item, tradeNotes, now));
  const sheet = variant === "sheet";

  // a moderator notice leads nowhere, so opening it only marks it read
  const openRow = (item: Notification) => {
    if (item.readAt === null) markRead.mutate({ ids: [item.id] });
    if (item.type !== "sanction") onNavigate();
  };

  return (
    <div className={cn("flex flex-col", sheet ? "min-h-0 flex-1" : "max-h-128")}>
      <div className="flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
        <div className="flex min-w-0 items-baseline gap-2">
          {sheet ? (
            <SheetTitle className="font-display text-base">{m.notification_title()}</SheetTitle>
          ) : (
            <PopoverTitle className="font-display text-base">{m.notification_title()}</PopoverTitle>
          )}
          {unread > 0 ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {m.notification_new_count({ count: unread })}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {empty && kind === "all" ? null : sheet ? (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={m.notification_mark_all_read()}
              disabled={unread === 0}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate({ kind })}
            >
              <ChecksIcon />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={unread === 0}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate({ kind })}
            >
              <ChecksIcon />
              {m.notification_mark_all_read()}
            </Button>
          )}
          <Button
            variant="ghost"
            size={sheet ? "icon-lg" : "icon-sm"}
            aria-label={m.notification_settings_link()}
            render={<Link to="/account/notifications" />}
            onClick={onNavigate}
          >
            <GearIcon />
          </Button>
          {sheet ? (
            <SheetClose
              render={<Button variant="ghost" size="icon-lg" aria-label={m.common_modal_close()} />}
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
          ) : empty ? (
            <EmptyState
              icon={BellIcon}
              bordered={false}
              title={EMPTY[kind].title()}
              hint={EMPTY[kind].hint()}
              preview={<ExampleRow framed={kind === "alerts"} />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={EMPTY[kind].to} />}
                  onClick={onNavigate}
                >
                  {EMPTY[kind].action()}
                </Button>
              }
            />
          ) : (
            <>
              {kind === "all" && unread === 0 ? (
                <p className="text-muted-foreground flex items-center gap-2 border-b px-5 py-2.5 text-sm">
                  <ChecksIcon aria-hidden className="size-4" />
                  {m.notification_caught_up()}
                </p>
              ) : null}
              {SECTIONS.map((section) => {
                const rows = sections.get(section);
                if (!rows) return null;
                return (
                  <section key={section} aria-labelledby={`notification-section-${section}`}>
                    <h3
                      id={`notification-section-${section}`}
                      className="text-muted-foreground bg-popover sticky top-0 z-20 border-b px-5 pt-3 pb-1.5 text-xs font-medium tracking-wide uppercase"
                    >
                      {SECTION_LABEL[section]()}
                    </h3>
                    <ul className="flex flex-col divide-y">
                      {rows.map((item) => (
                        <li key={item.id}>
                          <NotificationRow
                            notification={item}
                            collections={collections}
                            now={now}
                            variant={variant}
                            onOpen={() => openRow(item)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
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
    </div>
  );
}

/** A dimmed row of the kind a tab would list, drawn as shapes so it reads as an example. */
function ExampleRow({ framed }: { framed: boolean }) {
  return (
    <div
      aria-hidden
      className="mb-3 flex w-full max-w-72 items-start gap-3 rounded-lg border border-dashed p-3 opacity-60"
    >
      <span className="relative h-12 w-11 shrink-0">
        <span
          className={cn(
            "bg-muted absolute start-2.5 top-0 h-10 w-7 rounded-sm opacity-50",
            framed && "outline-type-want outline-1 outline-offset-1",
          )}
        />
        <span
          className={cn(
            "bg-muted absolute start-0 top-1 h-10 w-7 rounded-sm",
            framed && "outline-type-want outline-1 outline-offset-1",
          )}
        />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 pt-1">
        <span className="bg-muted h-3 w-4/5 rounded" />
        <span className="bg-muted h-2.5 w-1/2 rounded" />
      </span>
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
