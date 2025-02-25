"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function UnownedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.unowned}
      onChange={(v) =>
        setFilters({
          unowned: v,
        })
      }
    >
      Show Unowned
    </Toggle>
  );
}
