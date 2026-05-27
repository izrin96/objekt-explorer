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

  return (
    <span className="flex items-center gap-2 font-medium">
      {m.common_count_total({ count: displayCount.toLocaleString() })}
      {grouped
        ? ` (${m.common_count_types({ count: grouped?.length.toLocaleString() ?? "0" })})`
        : ""}
      {isLoading && <Loader variant="ring" />}
    </span>
  );
}
