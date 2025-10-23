import { useCallback } from "react";
import type { Key } from "react-aria-components";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { MultipleSelect, MultipleSelectItem } from "../ui/multiple-select";

export default function CollectionFilter() {
  const { collections } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = filters.collection ?? [];

  const update = useCallback((value: Key[]) => {
    setFilters({
      collection: value.length > 0 ? (value as string[]) : null,
    });
  }, []);

  return (
    <MultipleSelect
      className="min-w-44 max-w-min"
      placeholder="Collection No."
      aria-label="Collection No."
      value={selected}
      onChange={update}
      items={collections.map((name) => ({ id: name, name }))}
    >
      {(item) => (
        <MultipleSelectItem id={item.id} textValue={item.name}>
          {item.name}
        </MultipleSelectItem>
      )}
    </MultipleSelect>
  );
}
