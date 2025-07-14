"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { MultipleSelect } from "../ui";

export default function CollectionFilter() {
  const t = useTranslations("filter");
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
      placeholder={t("collection_no")}
      aria-label={t("collection_no")}
      selectedKeys={selected}
      onSelectionChange={(set) => update(set as any, selected)}
    >
      {collections.map((item) => (
        <MultipleSelect.Item key={item} id={item} textValue={item}>
          {item}
        </MultipleSelect.Item>
      ))}
    </MultipleSelect>
  );
}
