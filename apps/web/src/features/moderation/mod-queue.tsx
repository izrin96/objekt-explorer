import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  ShieldCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { REPORT_REASONS } from "@repo/api/schemas/moderation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/rows-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { FLAG_LABEL, REASON_LABEL } from "./labels";
import { queueOptions } from "./queries";
import { When } from "./when";

/** Open reports grouped by the reported account, newest report first. */
export function ModQueue() {
  const query = useQuery(queueOptions());

  if (query.isPending) return <ModQueueSkeleton />;

  if (query.isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheckIcon}
        title={m.mod_queue_empty()}
        hint={m.mod_queue_empty_hint()}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {query.data.map((row) => {
        const name = row.identity.name;
        const reasons = REPORT_REASONS.filter((reason) => row.reasons[reason] > 0);
        const flags = FLAG_CATEGORIES.filter((category) => row.flags[category] > 0);
        return (
          <li key={row.userId}>
            <Link
              to="/mod/reports/$userId"
              params={{ userId: row.userId }}
              className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
            >
              <Avatar className="size-9 shrink-0">
                {row.user.image ? <AvatarImage src={row.user.image} alt="" /> : null}
                <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="min-w-0 font-semibold break-words">{name}</span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {m.mod_queue_open({ count: row.openReports })}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {reasons.map((reason) => (
                    <Badge key={reason} variant="outline" size="sm" className="tabular-nums">
                      {REASON_LABEL[reason]()} · {row.reasons[reason]}
                    </Badge>
                  ))}
                  {flags.map((category) => (
                    <Badge key={category} variant="secondary" size="sm" className="tabular-nums">
                      {m.mod_flag_count({
                        label: FLAG_LABEL[category](),
                        count: row.flags[category],
                      })}
                    </Badge>
                  ))}
                </span>
              </span>
              <When
                iso={row.latestAt}
                className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums max-sm:hidden"
              />
              <CaretRightIcon aria-hidden className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Also the route's pending view, under its header. */
export function ModQueueSkeleton() {
  return <RowsSkeleton rows={2} status />;
}
