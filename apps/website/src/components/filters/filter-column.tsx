import { useObjektColumn } from "@/hooks/use-objekt-column";
import { validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Select, SelectContent, SelectItem, SelectTrigger } from "../intentui/select";

export default function ColumnFilter() {
  const { columns, setColumns } = useObjektColumn();

  return (
    <Select
      className="w-32"
      value={columns}
      onChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label={m.filter_column()}
    >
      <SelectTrigger />
      <SelectContent className="min-w-40">
        {validColumns
          .map((a) => ({ id: a, name: `${a} ${m.filter_column().toLowerCase()}` }))
          .map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
