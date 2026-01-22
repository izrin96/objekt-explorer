"use client";

import type { ValidGroupBy } from "@repo/cosmo/types/common";
import type { Selection } from "react-aria-components";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui/menu";
import { useFilters } from "@/hooks/use-filters";

const map: Record<string, string> = {
  artist: "Artist",
  member: "Member",
  season: "Season",
  class: "Class",
};

export default function GroupBysFilter() {
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.group_bys ?? []);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidGroupBy>).values());
      return setFilters({
        group_bys: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline">Group By</Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {Object.keys(map).map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
