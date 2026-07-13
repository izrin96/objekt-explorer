import { useCallback } from "react";
import type { Key } from "react-aria-components";
import { Autocomplete, useFilter } from "react-aria-components/Autocomplete";
import { Popover } from "react-aria-components/Popover";

import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { useIsMobile } from "@/hooks/use-mobile";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Dialog } from "../intentui/dialog";
import { ListBox } from "../intentui/list-box";
import { SearchField, SearchInput } from "../intentui/search-field";
import { Select, SelectItem } from "../intentui/select";

export default function SeasonFilter() {
  const { contains } = useFilter({ sensitivity: "base" });
  const { seasons } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = filters.season ?? [];
  const isMobile = useIsMobile();

  const update = useCallback((value: Key[]) => {
    return setFilters({
      season: value.length > 0 ? (value as string[]) : null,
    });
  }, []);

  return (
    <Select
      selectionMode="multiple"
      value={selected}
      onChange={update}
      placeholder={m.filter_season()}
      aria-label={m.filter_season()}
      className="w-fit"
    >
      <Button intent="outline" data-selected={filters.season?.length}>
        {m.filter_season()}
      </Button>
      <Popover className="entering:fade-in exiting:fade-out entering:animate-in exiting:animate-out bg-overlay flex max-h-80 w-(--trigger-width) min-w-36 flex-col overflow-hidden rounded-lg border">
        <Dialog aria-label={m.filter_season()}>
          <Autocomplete filter={contains}>
            <div className="border-b py-0.5">
              <SearchField className="rounded-lg focus-within:ring-0" autoFocus={!isMobile}>
                <SearchInput className="border-none ring-0 focus:ring-0" />
              </SearchField>
            </div>
            <ListBox
              shouldFocusWrap
              className="max-h-[inherit] min-w-[inherit] rounded-t-none border-0 bg-transparent shadow-none"
            >
              {seasons.map((item) => (
                <SelectItem id={item} key={item} textValue={item}>
                  {item}
                </SelectItem>
              ))}
            </ListBox>
          </Autocomplete>
        </Dialog>
      </Popover>
    </Select>
  );
}
