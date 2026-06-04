import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { PopoverContent } from "@/components/intentui/popover";
import { Skeleton } from "@/components/intentui/skeleton";
import { Badge } from "@/components/shared/badge";
import { orpc } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function StatusPopoverContent() {
  const { data, isPending } = useQuery(orpc.status.get.queryOptions());

  return (
    <PopoverContent className="max-w-xs">
      <div className="flex flex-col gap-3 p-3 text-sm">
        {isPending ? (
          <StatusSkeleton />
        ) : data ? (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-fg font-display text-sm font-medium">
                  {m.status_database_label()}
                </span>
                <StatusBadge status={data.database.behind ? "down" : "up"}>
                  {data.database.behind
                    ? m.status_database_behind()
                    : m.status_database_up_to_date()}
                </StatusBadge>
              </div>
              {data.database.latestTransferDate && (
                <span className="text-muted-fg text-xs">
                  {m.status_database_last_transfer()}{" "}
                  {format(new Date(data.database.latestTransferDate), "yyyy/MM/dd hh:mm:ss a")}
                </span>
              )}
            </div>

            <div className="-mx-3 border-t" />

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-fg font-display text-sm font-medium">
                  {m.status_cosmo_api_label()}
                </span>
                <StatusBadge status={data.cosmo.status}>
                  {data.cosmo.status === "down"
                    ? m.status_cosmo_api_down()
                    : data.cosmo.status === "partial"
                      ? m.status_cosmo_api_partial()
                      : m.status_cosmo_api_up()}
                </StatusBadge>
              </div>
              {data.cosmo.status === "partial" && (
                <span className="text-muted-fg text-xs">{m.status_cosmo_api_partial_hint()}</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-muted-fg">{m.status_error()}</span>
        )}
      </div>
    </PopoverContent>
  );
}

function StatusSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" soft />
          <Skeleton className="h-5 w-20" soft />
        </div>
        <Skeleton className="h-3 w-48" soft />
      </div>
      <div className="-mx-3 border-t" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" soft />
          <Skeleton className="h-5 w-14" soft />
        </div>
      </div>
    </>
  );
}

function StatusBadge({
  status,
  children,
}: {
  status: "up" | "partial" | "down";
  children: React.ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "text-xxs",
        status === "down" &&
          "bg-red-100 text-red-600 border-red-500/30 dark:bg-red-950 dark:text-red-400",
        status === "partial" &&
          "bg-yellow-100 text-yellow-600 border-yellow-500/30 dark:bg-yellow-950 dark:text-yellow-400",
        status === "up" &&
          "bg-sky-100 text-sky-600 border-sky-500/30 dark:bg-sky-950 dark:text-sky-400",
      )}
    >
      {children}
    </Badge>
  );
}

export function useStatusClasses() {
  const { data } = useQuery(orpc.status.get.queryOptions());
  const overall = getOverallStatus(data);

  return cn(
    "[--btn-icon:currentColor]",
    overall === "down" &&
      "bg-red-100 text-red-600 border-red-500/30 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-900",
    overall === "partial" &&
      "bg-yellow-100 text-yellow-600 border-yellow-500/30 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-500/30 dark:hover:bg-yellow-900",
    overall === "up" &&
      "bg-sky-100 text-sky-600 border-sky-500/30 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-500/30 dark:hover:bg-sky-900",
  );
}

function getOverallStatus(
  data: { database: { behind: boolean }; cosmo: { status: string } } | undefined,
): "up" | "partial" | "down" {
  if (!data) return "down";
  if (data.database.behind || data.cosmo.status === "down") return "down";
  if (data.cosmo.status === "partial") return "partial";
  return "up";
}
