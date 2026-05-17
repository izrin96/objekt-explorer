import { type ValidGroupBy, validGroupBy } from "@repo/cosmo/types/common";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function GroupByFilter() {
  const [filters, setFilters] = useFilters();

  const map = {
    artist: m.filter_group_by_artist(),
    class: m.filter_group_by_class(),
    collectionNo: m.filter_group_by_collection_no(),
    member: m.filter_group_by_member(),
    season: m.filter_group_by_season(),
    seasonCollectionNo: m.filter_group_by_season_collection_no(),
  };

  const selected = new Set(filters.group_by ? [filters.group_by] : []);

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from((key as Set<ValidGroupBy>).values()).at(0) ?? null;
      return setFilters({
        group_by: value,
        group_dir: ["member", "class"].includes(value ?? "") ? "asc" : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.group_by}>
        {m.filter_group_by_label()}
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {Object.values(validGroupBy).map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
