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
    <span className={isLoading ? "flex items-center gap-2 font-semibold" : "font-semibold"}>
      <span>
        {m.common_count_total({ count: displayCount.toLocaleString() })}
        {grouped
          ? ` (${m.common_count_types({ count: grouped?.length.toLocaleString() ?? "0" })})`
          : ""}
      </span>
      {isLoading && <Loader variant="ring" className="size-4" />}
    </span>
  );
}
