import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SortState<Key extends string> = { key: Key; dir: "asc" | "desc" };

/** A column header that carries the table's sort; shared by the drawer's tables. */
export function SortableHeader<Key extends string>({
  sort,
  column,
  onToggle,
  children,
}: {
  sort: SortState<Key>;
  column: Key;
  onToggle: (key: Key) => void;
  children: ReactNode;
}) {
  const active = sort.key === column;

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="px-3 py-2 text-left font-medium"
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={cn(
          "focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase outline-none focus-visible:ring-2",
          active && "text-foreground",
        )}
      >
        {children}
        {/* the glyph pair the toolbar's sort button uses, so the two agree */}
        {active &&
          (sort.dir === "desc" ? (
            <SortAscendingIcon className="size-3.5" aria-hidden />
          ) : (
            <SortDescendingIcon className="size-3.5" aria-hidden />
          ))}
      </button>
    </th>
  );
}
