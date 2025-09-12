"use client";

import { useTranslations } from "next-intl";
import { useBreakpointColumnStore } from "@/hooks/use-breakpoint-column";
import { validColumns } from "@/lib/utils";
import { Select } from "../ui";

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
        {validColumns
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
