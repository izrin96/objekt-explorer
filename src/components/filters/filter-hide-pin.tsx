"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function HidePinFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.hidePin ?? false}
      onChange={(v) =>
        setFilters({
          hidePin: v === false ? null : true,
        })
      }
    >
      Disable Pin
    </Toggle>
  );
}
