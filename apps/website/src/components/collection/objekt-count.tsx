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
      {/* messages own the spacing around the number ("총 " / "개", "" / " total"); flex would strip it */}
      <span className="inline-flex items-baseline">
        <span className="whitespace-pre">{m.common_count_total_prefix()}</span>
        <SlotText text={displayCount.toLocaleString()} />
        <span className="whitespace-pre">{m.common_count_total_suffix()}</span>
      </span>
      {hasGrouped && <span className="text-muted-fg">·</span>}
      {hasGrouped && (
        <span className="inline-flex items-baseline">
          <span className="whitespace-pre">{m.common_count_types_prefix()}</span>
          <SlotText text={displayGroupedCount.toLocaleString()} />
          <span className="whitespace-pre">{m.common_count_types_suffix()}</span>
        </span>
      )}
      {isLoading && <Loader variant="ring" />}
    </span>
  );
}
