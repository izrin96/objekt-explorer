"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function TransferableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:inset-ring-primary font-medium"
      isSelected={filters.transferable}
      onChange={(v) =>
        setFilters({
          transferable: v,
        })
      }
    >
      Transferable
    </Toggle>
  );
}
