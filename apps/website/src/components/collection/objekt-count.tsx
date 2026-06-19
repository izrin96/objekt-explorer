import { SlotText } from "slot-text/react";

import { m } from "@/paraglide/messages";

import { Loader } from "../intentui/loader";

export interface ObjektCountProps {
  filtered: unknown[];
  grouped?: unknown[];
  hasNextPage?: boolean;
  total?: number;
}

export function ObjektCount({ filtered, grouped, hasNextPage, total }: ObjektCountProps) {
  const displayCount = total !== undefined ? total : filtered.length;
  const isLoading = hasNextPage && total === undefined;
  const displayGroupedCount = grouped?.length ?? 0;
  const hasGrouped = grouped && grouped.length > 0;

  return (
    <span
      className="flex items-center gap-1.5 font-medium"
      aria-label={`${m.common_count_total_prefix()}${displayCount.toLocaleString()}${m.common_count_total_suffix()}`}
    >
      <span className="inline-flex items-baseline gap-1">
        {m.common_count_total_prefix()}
        <SlotText text={displayCount.toLocaleString()} />
        {m.common_count_total_suffix()}
      </span>
      {hasGrouped && <span className="text-muted-fg">·</span>}
      {hasGrouped && (
        <span className="inline-flex items-baseline gap-1">
          {m.common_count_types_prefix()}
          <SlotText text={displayGroupedCount.toLocaleString()} />
          {m.common_count_types_suffix()}
        </span>
      )}
      {isLoading && <Loader variant="ring" />}
    </span>
  );
}
