"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import {
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react/dist/ssr";

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
      {filters.group_dir === "asc" ? (
        <SortDescendingIcon data-slot="icon" />
      ) : (
        <SortAscendingIcon data-slot="icon" />
      )}
      {filters.group_dir === "asc" ? "Ascending" : "Descending"}
    </Toggle>
  );
}
