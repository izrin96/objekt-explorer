"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Autocomplete, type Key, Popover, useFilter } from "react-aria-components";

import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";

import { Dialog } from "../ui/dialog";
import { ListBox } from "../ui/list-box";
import { SearchField, SearchInput } from "../ui/search-field";
import { Select, SelectItem, SelectTrigger } from "../ui/select";

export default function CollectionFilter() {
  const t = useTranslations("filter");
  const { contains } = useFilter({ sensitivity: "base" });
  const { collections } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = filters.collection ?? [];

  const update = useCallback((value: Key[]) => {
    return setFilters({
      collection: value.length > 0 ? (value as string[]) : null,
    });
  }, []);

  return (
    <Select
      selectionMode="multiple"
      value={selected}
      onChange={update}
      placeholder={t("collection_no")}
      aria-label={t("collection_no")}
      className="max-w-52"
    >
      <SelectTrigger />
      <Popover className="entering:fade-in exiting:fade-out entering:animate-in exiting:animate-out bg-overlay flex max-h-80 w-(--trigger-width) flex-col overflow-hidden rounded-lg border">
        <Dialog aria-label="Language">
          <Autocomplete filter={contains}>
            <div className="bg-muted border-b p-2">
              <SearchField className="bg-bg rounded-lg" autoFocus>
                <SearchInput />
              </SearchField>
            </div>
            <ListBox className="max-h-[inherit] min-w-[inherit] rounded-t-none border-0 bg-transparent shadow-none">
              {collections.map((collection) => (
                <SelectItem id={collection} key={collection} textValue={collection}>
                  {collection}
                </SelectItem>
              ))}
            </ListBox>
          </Autocomplete>
        </Dialog>
      </Popover>
    </Select>
  );
}
