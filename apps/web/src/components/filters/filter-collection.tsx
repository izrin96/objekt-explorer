"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Key } from "react-aria-components";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { MultipleSelect, MultipleSelectContent, MultipleSelectItem } from "../ui/multiple-select";

export default function CollectionFilter() {
  const t = useTranslations("filter");
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
      className="min-w-52 max-w-min"
      placeholder={t("collection_no")}
      aria-label={t("collection_no")}
      value={selected}
      onChange={update}
    >
      <MultipleSelectContent items={collections.map((name) => ({ id: name, name }))}>
        {(item) => (
          <MultipleSelectItem id={item.id} textValue={item.name}>
            {item.name}
          </MultipleSelectItem>
        )}
      </MultipleSelectContent>
    </MultipleSelect>
  );
}
