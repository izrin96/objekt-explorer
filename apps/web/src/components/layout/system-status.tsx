import { PulseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/user/hooks";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { orpc } from "@/lib/orpc";
import { formatTimestamp, relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

type OverallStatus = "up" | "down";

function useStatus() {
  return useQuery(orpc.status.get.queryOptions());
}

/** Anything red wins. */
function overallStatus(
  data: { database: { behind: boolean }; cosmo: { status: string } } | undefined,
): OverallStatus {
  if (!data) return "down";
  if (data.database.behind || data.cosmo.status === "down") return "down";
  return "up";
}

function useOverallStatus(): OverallStatus {
  const { data } = useStatus();

  return overallStatus(data);
}

/** Tinted-chip treatment, matching the Badge feedback variants. */
function triggerClass(overall: OverallStatus): string {
  return cn(
    "[&_svg]:opacity-100",
    overall === "down" &&
      "border-destructive/30 bg-destructive/8 text-destructive-foreground hover:bg-destructive/16 dark:border-destructive/20 dark:bg-destructive/16 dark:hover:bg-destructive/24",
    overall === "up" &&
      "border-success/30 bg-success/8 text-success-foreground hover:bg-success/16 dark:border-success/20 dark:bg-success/16 dark:hover:bg-success/24",
  );
}

export function SystemStatus({ label, className }: { label?: string; className?: string }) {
  const overall = useOverallStatus();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={label ? "sm" : "icon-sm"}
            aria-label={label ? undefined : m.nav_system_status()}
            className={cn(triggerClass(overall), className)}
          />
        }
      >
        <PulseIcon weight="regular" />
        {label}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        <StatusRows />
      </PopoverPopup>
    </Popover>
  );
}

function StatusRows() {
  const { data, isPending } = useStatus();

  if (isPending) return <StatusSkeleton />;
  if (!data) return <span className="text-muted-foreground text-sm">{m.status_error()}</span>;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-medium">{m.status_database_label()}</span>
          <Badge variant={data.database.behind ? "error" : "success"}>
            {data.database.behind ? m.status_database_behind() : m.status_database_up_to_date()}
          </Badge>
        </div>
        {data.database.latestTransferDate !== null && (
          <LastTransfer date={new Date(data.database.latestTransferDate)} />
        )}
      </div>

      <Separator className="-mx-(--viewport-inline-padding) data-[orientation=horizontal]:w-auto" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-medium">{m.status_cosmo_api_label()}</span>
          <Badge variant={data.cosmo.status === "down" ? "error" : "success"}>
            {data.cosmo.status === "down" ? m.status_cosmo_api_down() : m.status_cosmo_api_up()}
          </Badge>
        </div>
      </div>

      <LiveUpdates />
    </div>
  );
}

/**
 * This tab's own socket, not a server check: the server can reach Centrifugo while the browser
 * cannot. Only a signed-in tab opens it, and a drop is no outage, since the views it refreshes
 * poll instead, so it stays out of the overall colour.
 */
function LiveUpdates() {
  const { data: user } = useCurrentUser();
  const live = useUserSocketLive((state) => state.live);

  if (!user) return null;

  return (
    <>
      <Separator className="-mx-(--viewport-inline-padding) data-[orientation=horizontal]:w-auto" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-medium">{m.status_live_updates_label()}</span>
          <Badge variant={live ? "success" : "warning"}>
            {live ? m.status_live_updates_connected() : m.status_live_updates_connecting()}
          </Badge>
        </div>
        {!live && (
          <span className="text-muted-foreground text-xs">{m.status_live_updates_polling()}</span>
        )}
      </div>
    </>
  );
}

/**
 * The popover answers "is the indexer keeping up", which is a distance, not a wall-clock
 * reading; the exact stamp is one hover away.
 */
function LastTransfer({ date }: { date: Date }) {
  const now = useMinuteClock();

  return (
    <span className="text-muted-foreground text-xs">
      {m.status_database_last_transfer()}{" "}
      <time dateTime={date.toISOString()} title={formatTimestamp(date)}>
        {relativeTime(date.getTime(), now)}
      </time>
    </span>
  );
}

function StatusSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4.5 w-20" />
        </div>
        <Skeleton className="h-3 w-44" />
      </div>
      <Separator className="-mx-(--viewport-inline-padding) data-[orientation=horizontal]:w-auto" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4.5 w-12" />
        </div>
      </div>
    </div>
  );
}
