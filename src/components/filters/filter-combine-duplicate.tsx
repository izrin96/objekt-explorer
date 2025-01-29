"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function CombineDuplicateFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:inset-ring-primary"
      appearance="outline"
      size="medium"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: v ? true : null,
        })
      }
    >
      Combine duplicate
    </Toggle>
  );
}
