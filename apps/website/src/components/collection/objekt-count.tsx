import { useEffect, useRef } from "react";

import { m } from "@/paraglide/messages";

import { Loader } from "../intentui/loader";

export interface ObjektCountProps {
  filtered: unknown[];
  grouped?: unknown[];
  hasNextPage?: boolean;
  total?: number;
}

function DigitGroup({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const str = value.toLocaleString();

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.classList.remove("is-animating");
    void group.offsetHeight; // force reflow
    group.classList.add("is-animating");
  }, [value]);

  const chars = str.split("");
  const totalChars = chars.length;

  return (
    <span ref={ref} className="t-digit-group">
      {chars.map((ch, i) => (
        <span
          key={`${value}-${i}`}
          className="t-digit"
          data-stagger={i === totalChars - 2 ? "1" : i === totalChars - 1 ? "2" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
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
        <DigitGroup value={displayCount} />
        {m.common_count_total_suffix()}
      </span>
      {hasGrouped && <span className="text-muted-fg">·</span>}
      {hasGrouped && (
        <span className="inline-flex items-baseline gap-1">
          {m.common_count_types_prefix()}
          <DigitGroup value={displayGroupedCount} />
          {m.common_count_types_suffix()}
        </span>
      )}
      {isLoading && <Loader variant="ring" />}
    </span>
  );
}
