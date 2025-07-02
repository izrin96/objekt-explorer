"use client";

import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui";

export default function UnownedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary"
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
