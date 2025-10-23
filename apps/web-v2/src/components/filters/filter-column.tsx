import { useObjektColumn } from "@/hooks/use-objekt-column";
import { validColumns } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";

export default function ColumnFilter() {
  const { columns, setColumns } = useObjektColumn();

  return (
    <Select
      className="w-[130px]"
      value={columns}
      onChange={(value) => {
        setColumns(Number(value));
      }}
      aria-label="Columns"
    >
      <SelectTrigger />
      <SelectContent className="min-w-[160px]">
        {validColumns
          .map((a) => ({ id: a, name: `${a} columns` }))
          .map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
