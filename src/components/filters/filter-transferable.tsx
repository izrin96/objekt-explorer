"use client";

import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui";

export default function TransferableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="font-medium data-selected:inset-ring-primary"
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
