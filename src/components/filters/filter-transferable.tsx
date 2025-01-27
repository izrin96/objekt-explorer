"use client";

import { Toggle } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function TransferableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      className="data-selected:inset-ring-primary"
      size="medium"
      appearance="outline"
      isSelected={filters.transferable ?? false}
      onChange={(v) =>
        setFilters({
          transferable: v ? true : null,
        })
      }
    >
      Transferable
    </Toggle>
  );
}
