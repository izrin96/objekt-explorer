"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import {
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react/dist/ssr";

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
      {filters.sort_dir === "asc" ? (
        <SortDescendingIcon data-slot="icon" />
      ) : (
        <SortAscendingIcon data-slot="icon" />
      )}
      {filters.sort_dir === "asc" ? "Ascending" : "Descending"}
    </Toggle>
  );
}
