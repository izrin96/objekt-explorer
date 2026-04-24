import { useIntlayer } from "react-intlayer";

import { Loader } from "../intentui/loader";

export interface ObjektCountProps {
  filtered: unknown[];
  grouped?: unknown[];
  hasNextPage?: boolean;
  total?: number;
}

export function ObjektCount({ filtered, grouped, hasNextPage, total }: ObjektCountProps) {
  const content = useIntlayer("common");

  const displayCount = total !== undefined ? total : filtered.length;
  const isLoading = hasNextPage && total === undefined;

  return (
    <span className={isLoading ? "flex items-center gap-2 font-semibold" : "font-semibold"}>
      <span>
        {content.count.total({ count: displayCount.toLocaleString() }).value}
        {grouped
          ? ` (${content.count.types({ count: grouped?.length.toLocaleString() ?? "0" }).value})`
          : ""}
      </span>
      {isLoading && <Loader variant="ring" className="size-4" />}
    </span>
  );
}
