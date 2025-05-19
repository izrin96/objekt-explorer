"use client";

import { Select } from "../ui";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";

const cols = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ColumnFilter() {
  const { columns, setColumns } = useBreakpointColumn();

  return (
    <Select
      className="w-[130px]"
      selectedKey={columns}
      onSelectionChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label="Columns"
    >
      <Select.Trigger />
      <Select.List
        className="min-w-[160px]"
        items={cols.map((a) => ({ id: a, name: `${a} columns` }))}
      >
        {(item) => (
          <Select.Option id={item.id} textValue={item.name}>
            {item.name}
          </Select.Option>
        )}
      </Select.List>
    </Select>
  );
}
