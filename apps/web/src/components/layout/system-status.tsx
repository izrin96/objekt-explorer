import { PulseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { Shimmer } from "@/components/shared/shimmer";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type OverallStatus = "up" | "partial" | "down";

function useStatus() {
  return useQuery(orpc.status.get.queryOptions());
}

/** Anything red wins, then partial. */
function overallStatus(
  data: { database: { behind: boolean }; cosmo: { status: string } } | undefined,
): OverallStatus {
  if (!data) return "down";
  if (data.database.behind || data.cosmo.status === "down") return "down";
  if (data.cosmo.status === "partial") return "partial";
  return "up";
}

export function useOverallStatus(): OverallStatus {
  const { data } = useStatus();

  return overallStatus(data);
}

/**
 * The logo's dot and the nav trigger read the same status, so they are tinted
 * from one place — a green dot over a red pulse button would be a lie.
 */
export function statusDotClass(overall: OverallStatus): string {
  // `*-foreground`, not the bare fill token: `--success` / `--warning` are the
  // same pale chip colour in both themes and disappear on the light one
  return overall === "down"
    ? "after:bg-destructive-foreground"
    : overall === "partial"
      ? "after:bg-warning-foreground"
      : "after:bg-success-foreground";
}

/** Tinted-chip treatment, matching the Badge feedback variants. */
function triggerClass(overall: OverallStatus): string {
  return cn(
    "[&_svg]:opacity-100",
    overall === "down" &&
      "border-destructive/30 bg-destructive/8 text-destructive-foreground hover:bg-destructive/16 dark:border-destructive/20 dark:bg-destructive/16 dark:hover:bg-destructive/24",
    overall === "partial" &&
      "border-warning/30 bg-warning/8 text-warning-foreground hover:bg-warning/16 dark:border-warning/20 dark:bg-warning/16 dark:hover:bg-warning/24",
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
        {/* the popover answers "is the indexer keeping up", which is a
            distance, not a wall-clock reading; the exact stamp is one hover
            away */}
        {data.database.latestTransferDate !== null && (
          <span className="text-muted-foreground text-xs">
            {m.status_database_last_transfer()}{" "}
            <TimeAgo date={new Date(data.database.latestTransferDate)} />
          </span>
        )}
      </div>

      <Separator className="-mx-3 data-[orientation=horizontal]:w-auto" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-medium">{m.status_cosmo_api_label()}</span>
          <Badge
            variant={
              data.cosmo.status === "down"
                ? "error"
                : data.cosmo.status === "partial"
                  ? "warning"
                  : "success"
            }
          >
            {data.cosmo.status === "down"
              ? m.status_cosmo_api_down()
              : data.cosmo.status === "partial"
                ? m.status_cosmo_api_partial()
                : m.status_cosmo_api_up()}
          </Badge>
        </div>
        {data.cosmo.status === "partial" && (
          <span className="text-muted-foreground text-xs">{m.status_cosmo_api_partial_hint()}</span>
        )}
      </div>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4.5 w-20" />
        </div>
        <Shimmer className="h-3 w-44" />
      </div>
      <Separator className="-mx-3 data-[orientation=horizontal]:w-auto" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-4.5 w-12" />
        </div>
      </div>
    </div>
  );
}
