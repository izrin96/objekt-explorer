"use client";

import { Select } from "../ui";
import { GRID_COLUMNS } from "@/lib/utils";
import type { Key } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";

const cols = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ColumnFilter() {
  const [filters, setFilters] = useFilters();

  function update(key: Key) {
    const value = parseInt(key.toString());
    setFilters({
      column: value === GRID_COLUMNS ? null : value,
    });
  }

  return (
    <Select
      className="w-[120px]"
      placeholder="test"
      selectedKey={filters.column ?? 7}
      onSelectionChange={update}
      aria-label="Columns"
    >
      <Select.Trigger />
      <Select.List className="min-w-[160px]" items={cols.map((a) => ({ id: a, name: `${a} columns` }))}>
        {(item) => (
          <Select.Option id={item.id} textValue={item.name}>
            {item.name}
          </Select.Option>
        )}
      </Select.List>
    </Select>
  );
}
