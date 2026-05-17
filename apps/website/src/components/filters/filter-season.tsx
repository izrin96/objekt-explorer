import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function SeasonFilter() {
  const { seasons } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.season);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<string>).values());
      return setFilters({
        season: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.season?.length}>
        {m.filter_season()}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {seasons.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
