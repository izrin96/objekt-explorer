"use client";

import { IconSortDesc, IconSortAsc } from "@intentui/icons";
import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function GroupDirectionFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="w-[125px] font-medium"
      isSelected={filters.group_dir === "asc"}
      onChange={(v) =>
        setFilters({
          group_dir: v ? "asc" : null,
        })
      }
    >
      {filters.group_dir === "asc" ? <IconSortAsc /> : <IconSortDesc />}
      {filters.group_dir === "asc" ? "Ascending" : "Descending"}
    </Toggle>
  );
}
