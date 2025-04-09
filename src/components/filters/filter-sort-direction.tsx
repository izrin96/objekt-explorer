"use client";

import { IconSortDesc, IconSortAsc } from "@intentui/icons";
import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function SortDirectionFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="w-[125px] font-medium"
      isSelected={filters.sort_dir === "asc"}
      onChange={(v) =>
        setFilters({
          sort_dir: v ? "asc" : null,
        })
      }
    >
      {filters.sort_dir === "asc" ? <IconSortAsc /> : <IconSortDesc />}
      {filters.sort_dir === "asc" ? "Ascending" : "Descending"}
    </Toggle>
  );
}
