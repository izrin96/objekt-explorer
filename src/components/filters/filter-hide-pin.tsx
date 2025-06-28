"use client";

import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui";

export default function HidePinFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="font-medium data-selected:inset-ring-primary"
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
