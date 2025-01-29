"use client";

import { IconSortDesc, IconSortAsc } from "justd-icons";
import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function SortDirectionFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
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
