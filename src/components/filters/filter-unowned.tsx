"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function UnownedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.unowned ?? false}
      onChange={(v) =>
        setFilters({
          unowned: v === false ? null : true,
        })
      }
    >
      Show Unowned
    </Toggle>
  );
}
