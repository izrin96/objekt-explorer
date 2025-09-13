"use client";

import { useTranslations } from "next-intl";
import { useObjektColumn } from "@/hooks/use-objekt-column";
import { validColumns } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui";

export default function ColumnFilter() {
  const t = useTranslations("filter");
  const { columns, setColumns } = useObjektColumn();

  return (
    <Select
      className="w-[130px]"
      selectedKey={columns}
      onSelectionChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label={t("column")}
    >
      <SelectTrigger />
      <SelectContent className="min-w-[160px]">
        {validColumns
          .map((a) => ({ id: a, name: `${a} ${t("column").toLowerCase()}` }))
          .map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
