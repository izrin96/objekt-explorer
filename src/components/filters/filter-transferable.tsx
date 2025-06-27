"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function TransferableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.transferable ?? false}
      onChange={(v) =>
        setFilters({
          transferable: v === false ? null : true,
        })
      }
    >
      Transferable
    </Toggle>
  );
}
