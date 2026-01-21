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
    setFilters({
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
      <Popover className="entering:fade-in exiting:fade-out flex max-h-80 w-(--trigger-width) entering:animate-in exiting:animate-out flex-col overflow-hidden rounded-lg border bg-overlay">
        <Dialog aria-label="Language">
          <Autocomplete filter={contains}>
            <div className="border-b bg-muted p-2">
              <SearchField className="rounded-lg bg-bg" autoFocus>
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
