"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function CombineDuplicateFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: v === false ? null : true,
        })
      }
    >
      Combine duplicate
    </Toggle>
  );
}
