"use client";

import { useTranslations } from "next-intl";
import { useBreakpointColumnStore } from "@/hooks/use-breakpoint-column";
import { Select } from "../ui";

const cols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ColumnFilter() {
  const t = useTranslations("filter");
  const columns = useBreakpointColumnStore((a) => a.columns);
  const setColumns = useBreakpointColumnStore((a) => a.setColumns);

  return (
    <Select
      className="w-[130px]"
      selectedKey={columns}
      onSelectionChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label={t("column")}
    >
      <Select.Trigger />
      <Select.List className="min-w-[160px]">
        {cols
          .map((a) => ({ id: a, name: `${a} ${t("column").toLowerCase()}` }))
          .map((item) => (
            <Select.Option key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </Select.Option>
          ))}
      </Select.List>
    </Select>
  );
}
