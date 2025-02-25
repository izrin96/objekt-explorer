"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function CombineDuplicateFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.grouped}
      onChange={(v) =>
        setFilters({
          grouped: v,
        })
      }
    >
      Combine duplicate
    </Toggle>
  );
}
