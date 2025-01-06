"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function GridableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:border-primary"
      size="medium"
      appearance="outline"
      isSelected={filters.gridable ?? false}
      onChange={(v) =>
        setFilters({
          gridable: v ? true : null,
        })
      }
    >
      Gridable
    </Toggle>
  );
}
