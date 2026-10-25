import type { ReactNode } from "react";
import { VList } from "virtua";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { useElementSize } from "@/hooks/use-element-size";
import { m } from "@/paraglide/messages";

type Row<T> =
  | { type: "title"; key: string; title: string }
  | { type: "row"; key: string; items: T[] }
  | { type: "more"; key: string };

/** Card width the grid aims for; the column count follows the container's width. */
const CELL_PX = 112;

/**
 * A card grid virtualised by row inside a fixed-height container, such as a dialog's body.
 * It fills its flex parent, so the parent sets the height.
 */
export function VirtualCardGrid<T>({
  sections,
  getKey,
  renderItem,
  more,
}: {
  sections: { title: string | null; items: readonly T[] }[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  more?: { has: boolean; loading: boolean; failed: boolean; load: () => void };
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const columns = Math.max(3, Math.floor(width / CELL_PX));

  const rows: Row<T>[] = [];
  for (const [index, section] of sections.entries()) {
    if (section.items.length === 0) continue;
    if (section.title) rows.push({ type: "title", key: `t${index}`, title: section.title });
    for (let i = 0; i < section.items.length; i += columns) {
      rows.push({ type: "row", key: `r${index}:${i}`, items: section.items.slice(i, i + columns) });
    }
  }
  if (more?.has) rows.push({ type: "more", key: "more" });

  return (
    <div ref={ref} className="min-h-0 flex-1">
      {width > 0 ? (
        <VList data={rows} style={{ height: "100%" }} className="overscroll-contain">
          {(row) =>
            row.type === "title" ? (
              <h4 key={row.key} className="pt-1 pb-2 text-sm font-medium">
                {row.title}
              </h4>
            ) : row.type === "more" && more ? (
              <InfiniteSentinel
                key={row.key}
                label={m.infinite_query_load_more_aria()}
                hasNextPage={more.has}
                isFetchingNextPage={more.loading}
                isError={more.failed}
                fetchNextPage={more.load}
              />
            ) : row.type === "row" ? (
              <ul
                key={row.key}
                className="grid gap-2 pb-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {row.items.map((item) => (
                  <li key={getKey(item)} className="@container min-w-0">
                    {renderItem(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <div key={row.key} />
            )
          }
        </VList>
      ) : null}
    </div>
  );
}
