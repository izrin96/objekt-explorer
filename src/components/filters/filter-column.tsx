"use client";

import { NumberField } from "../ui";
import { GRID_COLUMNS } from "@/lib/utils";
import { useFilters } from "@/hooks/use-filters";

export default function ColumnFilter() {
  const [filters, setFilters] = useFilters();
  function update(value: number) {
    if (isNaN(value)) return;
    setFilters({
      column: value === GRID_COLUMNS ? null : value,
    });
  }

  return (
    <NumberField
      className="w-32"
      aria-label="Column"
      placeholder="Grid Column"
      onChange={update}
      value={filters.column ?? GRID_COLUMNS}
      minValue={3}
    />
  );
}
