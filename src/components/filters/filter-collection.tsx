"use client";

import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { MultipleSelect } from "../ui";

export default function CollectionFilter() {
  const { collections } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.collection), [filters.collection]);

  const update = useCallback(
    (updater: (prev: Selection) => Selection, currentSelection: Set<string>) => {
      const newSelection = updater(currentSelection);
      const selectedCollections = Array.from(newSelection) as string[];
      setFilters({
        collection: selectedCollections.length > 0 ? selectedCollections : null,
      });
    },
    [setFilters, filters.collection],
  );

  return (
    <MultipleSelect
      className="min-w-44 max-w-min"
      placeholder="Collection No."
      aria-label="Collection No."
      selectedKeys={selected}
      onSelectionChange={(set) => update(set as any, selected)}
      items={collections.map((collection) => ({ id: collection, value: collection }))}
    >
      {(item) => (
        <MultipleSelect.Item id={item.id} textValue={item.value}>
          {item.value}
        </MultipleSelect.Item>
      )}
    </MultipleSelect>
  );
}
