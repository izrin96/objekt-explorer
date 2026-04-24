import { useIntlayer } from "react-intlayer";

import { useObjektColumn } from "@/hooks/use-objekt-column";
import { validColumns } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger } from "../intentui/select";

export default function ColumnFilter() {
  const content = useIntlayer("filter");
  const { columns, setColumns } = useObjektColumn();

  return (
    <Select
      className="w-[130px]"
      value={columns}
      onChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label={content.column.value}
    >
      <SelectTrigger />
      <SelectContent className="min-w-[160px]">
        {validColumns
          .map((a) => ({ id: a, name: `${a} ${content.column.value.toLowerCase()}` }))
          .map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
