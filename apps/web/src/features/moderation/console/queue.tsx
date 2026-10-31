import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  FunnelSimpleIcon,
  ShieldCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { REPORT_REASONS } from "@repo/api/schemas/moderation";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { RowsSkeleton } from "@/components/shared/rows-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FLAG_LABEL, REASON_LABEL } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { queueOptions } from "./queries";
import { When } from "./when";

type Row = Outputs["moderation"]["queue"][number];

const FILTERS = ["all", "shared", "flagged"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, () => string> = {
  all: m.mod_queue_filter_all,
  shared: m.mod_queue_filter_shared,
  flagged: m.mod_queue_filter_flagged,
};

const MATCHES: Record<Filter, (row: Row) => boolean> = {
  all: () => true,
  shared: (row) => row.sharedExcerpts > 0,
  flagged: (row) => FLAG_CATEGORIES.some((category) => row.flags[category] > 0),
};

/** Open reports grouped by the reported account, newest report first. */
export function ModQueue() {
  const query = useQuery(queueOptions());
  const openId = useParams({ strict: false, select: (params) => params.userId });
  const [filter, setFilter] = useState<Filter>("all");

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

  const rows = query.data.filter(MATCHES[filter]);
  const openReports = query.data.reduce((sum, row) => sum + row.openReports, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs tabular-nums">
        {m.mod_queue_summary({
          reports: openReports.toLocaleString(getLocale()),
          accounts: query.data.length.toLocaleString(getLocale()),
        })}
      </p>
      {/* single choice, so pressing the active filter again (an empty group) is ignored */}
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label={m.mod_queue_filter_label()}
        value={[filter]}
        onValueChange={([next]) => {
          const picked = FILTERS.find((value) => value === next);
          if (picked) setFilter(picked);
        }}
        className="w-full *:flex-1"
      >
        {FILTERS.map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className="text-muted-foreground data-pressed:text-foreground gap-1.5"
          >
            {FILTER_LABEL[value]()}
            <span className="text-xs tabular-nums opacity-70">
              {query.data.filter(MATCHES[value]).length}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {rows.length === 0 ? (
        <EmptyState icon={FunnelSimpleIcon} title={m.mod_queue_filter_empty()} />
      ) : (
        <ul className="bg-card flex flex-col divide-y overflow-hidden rounded-lg border">
          {rows.map((row) => (
            <QueueRow key={row.userId} row={row} current={row.userId === openId} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One reason and one flag, the most reported first; the rest are counted, not listed. */
function QueueRow({ row, current }: { row: Row; current: boolean }) {
  const name = row.identity.name;
  const reasons = REPORT_REASONS.filter((reason) => row.reasons[reason] > 0).toSorted(
    (a, b) => row.reasons[b] - row.reasons[a],
  );
  const flags = FLAG_CATEGORIES.filter((category) => row.flags[category] > 0).toSorted(
    (a, b) => row.flags[b] - row.flags[a],
  );
  const [reason] = reasons;
  const [flag] = flags;
  const more = Math.max(reasons.length - 1, 0) + Math.max(flags.length - 1, 0);

  return (
    <li>
      <Link
        to="/mod/reports/$userId"
        params={{ userId: row.userId }}
        aria-current={current ? "page" : undefined}
        className="hover:bg-secondary/60 focus-visible:ring-ring aria-[current=page]:bg-secondary flex items-start gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        <PersonAvatar name={name} image={row.user.image} className="size-9 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {/* the name has the line to itself: beside a full timestamp the sidebar left it a few letters */}
          <span className="truncate font-semibold">{name}</span>
          <span className="text-muted-foreground flex flex-wrap gap-x-1.5 text-xs tabular-nums">
            <span>
              {m.mod_queue_open({ count: row.openReports.toLocaleString(getLocale()) })}
              {row.sharedExcerpts > 0 ? (
                <>
                  {" "}
                  · {m.mod_queue_shared({ count: row.sharedExcerpts.toLocaleString(getLocale()) })}
                </>
              ) : null}
            </span>
            <When iso={row.latestAt} />
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {reason ? (
              <Badge variant="outline" size="sm" className="tabular-nums">
                {REASON_LABEL[reason]()} · {row.reasons[reason]}
              </Badge>
            ) : null}
            {flag ? (
              <Badge variant="warning" size="sm" className="tabular-nums">
                {m.mod_flag_count({
                  label: FLAG_LABEL[flag](),
                  count: row.flags[flag].toLocaleString(getLocale()),
                })}
              </Badge>
            ) : null}
            {more > 0 ? (
              <span className="text-muted-foreground text-xs">
                {m.mod_queue_more({ count: more.toLocaleString(getLocale()) })}
              </span>
            ) : null}
          </span>
        </span>
        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground mt-2.5 size-4 shrink-0 xl:hidden"
        />
      </Link>
    </li>
  );
}

/** Also the route's pending view, under its header. */
export function ModQueueSkeleton() {
  return <RowsSkeleton rows={2} status />;
}
